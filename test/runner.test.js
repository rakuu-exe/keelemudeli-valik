// Tests of the core pipeline with the fake adapter: raw row shape, order and resuming.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAdapter, ApiError } from '../src/adapters/index.js';
import { loadTaskBank, buildUserMessage } from '../src/taskBank.js';
import { buildPlan, executePlan, usageTotalMatches } from '../src/runner/run.js';
import { buildRawRow, readRawRows, rawRowKey } from '../src/runner/rawRows.js';

const bank = loadTaskBank();
const MODELS = JSON.parse(fs.readFileSync(new URL('../config/models.json', import.meta.url), 'utf8'));
const RAW_ROW_FIELDS = [
  'key', 'runId', 'taskId', 'modelId', 'modelRequested', 'modelVersion', 'repeat', 'tsStartUtc',
  'ttftMs', 'totalMs', 'status', 'error', 'finishReason', 'usage', 'usageRaw', 'text',
];

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-')), 'raw.jsonl');
const fakeAdapters = (plan, options = {}) =>
  new Map(plan.models.map((m) => [m.id, createAdapter({ ...m, adapter: 'fake' }, options)]));

describe('raw row', () => {
  const model = MODELS.models[0];
  const base = { runId: 'r', taskId: 'K2-026', model, repeat: 3, tsStartUtc: '2026-11-02T10:00:00.000Z' };

  test('key and fields as in CLAUDE.md (incl. usageRaw)', () => {
    const result = {
      text: ' Tallinn\n', modelVersion: 'v', finishReason: 'stop', ttftMs: 1.5, totalMs: 2.5,
      usage: { input: 1, cachedInput: null, output: 2, reasoning: null }, usageRaw: { a: 1 },
    };
    const row = buildRawRow({ ...base, result });
    assert.deepEqual(Object.keys(row), RAW_ROW_FIELDS);
    assert.equal(row.key, 'r|K2-026|openai|3');
    assert.equal(row.modelRequested, 'gpt-6.1-terra');
    assert.equal(row.status, 'ok');
    assert.equal(row.text, ' Tallinn\n'); // the raw answer is not cleaned
  });

  test('error row: status error, answer fields null', () => {
    const row = buildRawRow({ ...base, error: new ApiError('Rate limit', { status: 429, retryable: true }) });
    assert.deepEqual(Object.keys(row), RAW_ROW_FIELDS);
    assert.equal(row.status, 'error');
    assert.deepEqual(row.error, { httpStatus: 429, message: 'Rate limit' });
    assert.equal(row.text, null);
    assert.equal(row.usage, null);
  });
});

describe('pipeline', () => {
  const run = { runId: 'test', models: ['openai', 'anthropic', 'google'], tasks: ['K1-001', 'K2-001'], repeats: 2 };

  test('rounds: outer loop is the repeat, inner loop is tasks × models', () => {
    const plan = buildPlan(run, MODELS, bank);
    assert.equal(plan.requests.length, 2 * 2 * 3);
    assert.deepEqual(
      plan.requests.slice(0, 7).map((p) => `${p.repeat}|${p.task.id}|${p.model.id}`),
      [
        '1|K1-001|openai', '1|K1-001|anthropic', '1|K1-001|google',
        '1|K2-001|openai', '1|K2-001|anthropic', '1|K2-001|google',
        '2|K1-001|openai',
      ],
    );
  });

  test('"all" = all 120 tasks; unknown model or task → error', () => {
    assert.equal(buildPlan({ ...run, tasks: 'all', repeats: 1 }, MODELS, bank).requests.length, 120 * 3);
    assert.throws(() => buildPlan({ ...run, models: ['missing'] }, MODELS, bank), /missing/);
    assert.throws(() => buildPlan({ ...run, tasks: ['K9-999'] }, MODELS, bank), /K9-999/);
  });

  test('every request is stored; the adapter gets the user message built from the template', async () => {
    const file = tempFile();
    const plan = buildPlan(run, MODELS, bank);
    const sent = [];
    const adapters = fakeAdapters(plan, { respond: (message) => (sent.push(message), 'Tallinn') });
    await executePlan({ run, plan, bank, outputFile: file, adapters });

    const rows = readRawRows(file);
    assert.equal(rows.length, 12);
    assert.equal(new Set(rows.map((r) => r.key)).size, 12);
    assert.ok(rows.every((r) => r.status === 'ok' && r.text === 'Tallinn'));
    const k1 = bank.tasks.find((t) => t.id === 'K1-001');
    assert.equal(sent[0], buildUserMessage(k1, bank));
  });

  test('an interrupted run resumes without duplicates', async () => {
    const file = tempFile();
    const plan = buildPlan(run, MODELS, bank);
    // The first run stops at the 5th request (e.g. the process is killed).
    let n = 0;
    const interrupted = new Map(plan.models.map((m) => [m.id, async (message) => {
      if (++n === 5) throw new Error('interrupted');
      return createAdapter({ ...m, adapter: 'fake' })(message);
    }]));
    await assert.rejects(executePlan({ run, plan, bank, outputFile: file, adapters: interrupted }), /interrupted/);
    assert.equal(readRawRows(file).length, 4);

    const added = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan) });
    assert.equal(added.length, 8);
    const rows = readRawRows(file);
    assert.equal(rows.length, 12);
    assert.equal(new Set(rows.map((r) => r.key)).size, 12);

    const third = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan) });
    assert.equal(third.length, 0);
  });

  test('API error → error row, the run continues', async () => {
    const file = tempFile();
    const plan = buildPlan({ ...run, repeats: 1 }, MODELS, bank);
    const adapters = fakeAdapters(plan, {
      fail: (_, m) => (m.id === 'google' ? new ApiError('Bad request', { status: 400 }) : null),
    });
    await executePlan({ run: { ...run, repeats: 1 }, plan, bank, outputFile: file, adapters });
    const rows = readRawRows(file);
    assert.equal(rows.length, 6);
    assert.deepEqual(rows.filter((r) => r.status === 'error').map((r) => r.key), [
      rawRowKey({ runId: 'test', taskId: 'K1-001', modelId: 'google', repeat: 1 }),
      rawRowKey({ runId: 'test', taskId: 'K2-001', modelId: 'google', repeat: 1 }),
    ]);
  });

  test('existing rows stay unchanged (the file only grows)', async () => {
    const file = tempFile();
    const plan = buildPlan({ ...run, repeats: 1 }, MODELS, bank);
    await executePlan({ run, plan: { ...plan, requests: plan.requests.slice(0, 2) }, bank, outputFile: file, adapters: fakeAdapters(plan) });
    const before = fs.readFileSync(file, 'utf8');
    await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan) });
    assert.ok(fs.readFileSync(file, 'utf8').startsWith(before));
  });
});

describe('usageTotalMatches', () => {
  test('OpenAI-compatible total_tokens and Gemini totalTokenCount', () => {
    assert.equal(usageTotalMatches({ usage: { input: 32, output: 103 }, usageRaw: { total_tokens: 135 } }), true);
    assert.equal(usageTotalMatches({ usage: { input: 32, output: 9 }, usageRaw: { total_tokens: 135 } }), false);
    assert.equal(usageTotalMatches({ usage: { input: 214, output: 57 }, usageRaw: { totalTokenCount: 271 } }), true);
    assert.equal(usageTotalMatches({ usage: { input: 1, output: 2 }, usageRaw: { input_tokens: 1 } }), null);
  });
});
