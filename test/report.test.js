// Tests of the pilot report data and the judge review (PLAN.md phase 5). Synthetic rows only.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadTaskBank } from '../src/taskBank.js';
import { buildRawRow } from '../src/runner/rawRows.js';
import { ApiError } from '../src/adapters/index.js';
import { createScorer, scoreRawRows } from '../src/checkers/score.js';
import { buildReportData } from '../src/report/pilot.js';
import { renderJudgeCheck } from '../src/judge/review.js';
import { prepareJudgeFiles } from '../src/judge/prepare.js';
import { scoresFile } from '../src/judge/common.js';

const bank = loadTaskBank();
const MODELS = JSON.parse(fs.readFileSync(new URL('../config/models.json', import.meta.url), 'utf8'));
const MODEL = Object.fromEntries(MODELS.models.map((m) => [m.id, m]));

const ok = (modelId, taskId, text, { finishReason = 'stop', ts = '2026-11-03T12:00:00.000Z' } = {}) => buildRawRow({
  runId: 'pilot', taskId, model: MODEL[modelId], repeat: 1, tsStartUtc: ts,
  result: { text, modelVersion: 'v', finishReason, ttftMs: 100, totalMs: 1000, usageRaw: {},
    usage: { input: 10, cachedInput: null, output: 5, reasoning: null } },
});

describe('pilot report data', () => {
  const raw = [
    ok('openai', 'K1-002', '47'),
    ok('anthropic', 'K1-002', '**47**'),
    ok('openai', 'K1-001', 'Tartu'),
    ok('anthropic', 'K1-001', 'Pärnu', { finishReason: 'max_tokens', ts: '2026-11-03T12:10:00.000Z' }),
    buildRawRow({ runId: 'pilot', taskId: 'K2-001', model: MODEL.openai, repeat: 1, tsStartUtc: '2026-11-03T12:05:00.000Z',
      error: new ApiError('Overloaded', { status: 529, retryable: true }) }),
  ];
  const { rows: scored } = scoreRawRows(raw, createScorer(bank));
  const cost = scored.map((s) => ({ key: s.key, costCriterion: 0.001, costBilled: 0.001 }));
  const text = buildReportData({ runId: 'pilot', raw, scored, cost, judgeKey: [], judgeScores: [], bank });

  test('errors and truncated answers are listed', () => {
    assert.match(text, /ERROR pilot\|K2-001\|openai\|1: 529 Overloaded/);
    assert.match(text, /TRUNCATED pilot\|K1-001\|anthropic\|1: finishReason max_tokens/);
  });

  test('a task where all models are wrong is suspicious', () => {
    const section = text.split('### All models correctness 0')[1].split('###')[0];
    assert.match(section, /\*\*K1-001\*\*/);
    assert.doesNotMatch(section, /K1-002/);
  });

  test('a K1 answer that is right apart from Markdown marks is listed', () => {
    const section = text.split('### K1: correct after removing Markdown marks')[1].split('###')[0];
    assert.match(section, /pilot\|K1-002\|anthropic\|1/);
    assert.doesNotMatch(section, /openai/);
  });

  test('cost in total and the main run estimate (×5)', () => {
    assert.match(text, /costBilled in total: \$0\.0040/);
    assert.match(text, /Estimate for the main run \(×5\): about \$0\.0200/);
  });
});

describe('judge review', () => {
  test('a sample of the run\'s judge files with the 3 scores; no model name or key', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-'));
    const samples = JSON.parse(fs.readFileSync(new URL('./fixtures/k3_sample_answers.json', import.meta.url), 'utf8')).answers;
    const raw = ['openai', 'anthropic', 'google'].map((m) => ok(m, 'K3-026', samples['K3-026']));
    const added = prepareJudgeFiles({ rawRows: raw, bank, dir, seedText: 'pilot' });
    fs.writeFileSync(scoresFile(dir), added.flatMap(({ id }) => [1, 2, 3].map((repeat) =>
      JSON.stringify({ id, repeat, score: 2, justification: 'Proportsioon õige.', invalidAttempts: [] }) + '\n')).join(''));
    const md = renderJudgeCheck({ runId: 'pilot', dir, n: 2 });
    assert.match(md, /2 of 3 judge files/);
    assert.equal((md.match(/^## \d+\. H\d{4}$/gm) ?? []).length, 2);
    assert.match(md, /repeat 3: score 2 — Proportsioon õige\./);
    assert.match(md, /Median 2 → correctness 1/);
    for (const secret of ['openai', 'anthropic', 'google', 'gpt-6', 'claude-', 'gemini', 'pilot|']) {
      assert.ok(!md.includes(secret), secret);
    }
  });
});
