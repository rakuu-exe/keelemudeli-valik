// Tests of the LLM judge (PLAN.md phase 3b). No real judge calls: a fake callJudge, or a stand-in
// script instead of `claude` (test/fixtures/fake_claude.mjs) for the child process checks.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { loadTaskBank } from '../src/taskBank.js';
import { createAdapter } from '../src/adapters/index.js';
import { buildPlan, executePlan } from '../src/runner/run.js';
import { readRawRows } from '../src/runner/rawRows.js';
import { createScorer, scoreRawRows } from '../src/checkers/score.js';
import {
  ANSWER_SCHEMA, JUDGE_MODEL, judgeCorrectnessByKey, judgeInput, median, readKey, readScores, scoresFile,
} from '../src/judge/common.js';
import { prepareJudgeFiles } from '../src/judge/prepare.js';
import { claudeArgs, createClaudeCall, judgeEnv, PROMPT_FILE } from '../src/judge/claude.js';
import {
  createFakeJudge, ERROR_WAITS_MS, FAKE_MODEL, interpretCall, runJudge, usageLimitWaitMs, USAGE_LIMIT_POLL_MS,
} from '../src/judge/run.js';

const bank = loadTaskBank();
const MODELS = JSON.parse(fs.readFileSync(new URL('../config/models.json', import.meta.url), 'utf8'));
const JUDGE_TASKS = ['K3-026', 'K3-027', 'K3-028', 'K3-031', 'K3-033', 'K3-035', 'K3-037', 'K3-039'];
const FAKE_CLAUDE = fileURLToPath(new URL('./fixtures/fake_claude.mjs', import.meta.url));
const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'judge-test-'));
const noWait = async () => {};

// Raw rows of a small fake run: two judge tasks, two other tasks, 3 models, 2 repeats.
async function fakeRun(runId = 'pilot', tasks = ['K1-001', 'K3-026', 'K3-001', 'K3-031']) {
  const run = { runId, models: ['openai', 'anthropic', 'google'], tasks, repeats: 2 };
  const plan = buildPlan(run, MODELS, bank);
  const file = path.join(tempDir(), 'raw.jsonl');
  const adapters = new Map(plan.models.map((m) => [m.id, createAdapter({ ...m, adapter: 'fake' }, {
    respond: (message) => `Kokkuvõte: sõnumis oli ${message.length} märki.`,
  })]));
  await executePlan({ run, plan, bank, outputFile: file, adapters });
  return readRawRows(file);
}

// A claude -p JSON result as it looked in the real call of 3.11.2026 (only the fields used).
const result = ({ score = 2, justification = 'Põhjendus.', model = JUDGE_MODEL, ...rest } = {}) => ({
  exitCode: 0, stderr: '', timedOut: false,
  stdout: JSON.stringify({
    type: 'result', subtype: 'success', is_error: false, result: JSON.stringify({ score, justification }),
    structured_output: { score, justification }, modelUsage: { [model]: { inputTokens: 2 } }, ...rest,
  }),
});

describe('judge prompt and call flags', () => {
  const prompt = fs.readFileSync(PROMPT_FILE, 'utf8');
  const ji = bank.judge_instructions;

  test('the system prompt has the task bank principle, system rules and output format word for word', () => {
    assert.ok(prompt.includes(ji.principle));
    for (const rule of ji.system_rules) assert.ok(prompt.includes(rule), rule);
    assert.ok(prompt.includes(ji.output_format));
  });

  test('the answer keys are in English everywhere: score, justification (author\'s decision 3.11.2026)', () => {
    assert.match(ji.output_format, /\{"score": 0\|1\|2, "justification": "kuni 30 sõna"\}/);
    assert.ok(!/skoor|"põhjendus"/.test(prompt + ji.output_format));
    assert.deepEqual(Object.keys(ANSWER_SCHEMA.properties), ['score', 'justification']);
  });

  test('the flags of PLAN.md phase 3b, exactly', () => {
    assert.deepEqual(claudeArgs('prompts/judge.txt'), [
      '-p', '--safe-mode', '--system-prompt-file', 'prompts/judge.txt', '--tools', '',
      '--model', 'claude-opus-5-5', '--effort', 'medium',
      '--output-format', 'json', '--json-schema', JSON.stringify(ANSWER_SCHEMA),
      '--no-session-persistence',
    ]);
  });

  test('the answer schema is a valid JSON schema: score 0/1/2 and a justification', () => {
    const validate = new Ajv2020({ strict: true }).compile(ANSWER_SCHEMA);
    assert.ok(validate({ score: 2, justification: 'x' }));
    assert.ok(!validate({ score: 3, justification: 'x' }));
    assert.ok(!validate({ score: 1.5, justification: 'x' }));
    assert.ok(!validate({ score: 1 }));
  });

  test('ANTHROPIC_API_KEY (and ANTHROPIC_AUTH_TOKEN) are removed from the child environment', () => {
    const env = judgeEnv({ PATH: '/bin', ANTHROPIC_API_KEY: 'k', Anthropic_Api_Key: 'k2', ANTHROPIC_AUTH_TOKEN: 't', OPENAI_API_KEY: 'o' });
    assert.deepEqual(Object.keys(env), ['PATH', 'OPENAI_API_KEY']);
  });
});

describe('the child process (stand-in for claude)', () => {
  test('no API key, an empty new folder, the input on stdin unchanged; the folder is removed afterwards', async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    try {
      const call = createClaudeCall({ command: process.execPath, args: [FAKE_CLAUDE] });
      const input = judgeInput({ sourceText: 'Õun, äädikas, öö, üle.', instruction: 'Võta kokku.', rubric: '0 = …', answer: 'Šokk' });
      const r = await call(input);
      assert.equal(r.exitCode, 0);
      const report = JSON.parse(r.stdout);
      assert.ok(!report.envKeys.some((k) => k.toUpperCase() === 'ANTHROPIC_API_KEY'));
      assert.deepEqual(report.cwdEntries, []);
      assert.notEqual(path.resolve(report.cwd), path.resolve(process.cwd()));
      assert.ok(!fs.existsSync(report.cwd), 'the temporary folder is removed');
      assert.equal(report.input, input);
    } finally {
      if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = saved;
    }
  });

  test('a call that does not finish is killed at the timeout', { timeout: 10_000 }, async () => {
    const call = createClaudeCall({ command: process.execPath, args: [FAKE_CLAUDE, '--hang'], timeoutMs: 200 });
    const r = await call('{}');
    assert.equal(r.timedOut, true);
    assert.equal(interpretCall(r).kind, 'error');
  });
});

describe('anonymous judge files (prepare)', () => {
  test('only ok answers to the 8 judge tasks; a file has only the ID and the four fields', async () => {
    const rawRows = await fakeRun();
    const dir = tempDir();
    const added = prepareJudgeFiles({ rawRows, bank, dir, seedText: 'pilot' });
    const judgeRows = rawRows.filter((r) => JUDGE_TASKS.includes(r.taskId));
    assert.equal(added.length, judgeRows.length); // 2 tasks × 3 models × 2 repeats
    assert.equal(added.length, 12);

    for (const { id, key } of added) {
      assert.match(id, /^H\d{4}$/);
      const text = fs.readFileSync(path.join(dir, 'input', `${id}.json`), 'utf8');
      const file = JSON.parse(text);
      assert.deepEqual(Object.keys(file), ['id', 'sourceText', 'instruction', 'rubric', 'answer']);
      const raw = rawRows.find((r) => r.key === key);
      const task = bank.tasks.find((t) => t.id === raw.taskId);
      assert.deepEqual(file, { id, sourceText: task.input, instruction: task.instruction, rubric: task.check.rubric, answer: raw.text });
      // The file does not name the model or the key.
      for (const secret of [raw.key, raw.modelId, raw.modelRequested, raw.runId + '|']) assert.ok(!text.includes(secret), secret);
    }
    assert.deepEqual(readKey(dir), added);
    assert.equal(new Set(added.map((r) => r.id)).size, added.length);
  });

  test('the judge input sends only the four fields, not even the ID', () => {
    const input = JSON.parse(judgeInput({ id: 'H0001', sourceText: 's', instruction: 'i', rubric: 'r', answer: 'a', extra: 'x' }));
    assert.deepEqual(input, { sourceText: 's', instruction: 'i', rubric: 'r', answer: 'a' });
  });

  test('IDs and order: random but the same with the same seed; not in the order of the raw rows', async () => {
    const rawRows = await fakeRun();
    const a = prepareJudgeFiles({ rawRows, bank, dir: tempDir(), seedText: 'pilot' });
    const b = prepareJudgeFiles({ rawRows, bank, dir: tempDir(), seedText: 'pilot' });
    assert.deepEqual(a, b);
    const judgeKeys = rawRows.filter((r) => JUDGE_TASKS.includes(r.taskId)).map((r) => r.key);
    assert.notDeepEqual(a.map((r) => r.key), judgeKeys);
    assert.notDeepEqual(a.map((r) => r.id), [...a.map((r) => r.id)].sort());
  });

  test('running again adds only new answers; existing files and key rows stay unchanged', async () => {
    const pilot = await fakeRun('pilot');
    const main = await fakeRun('main');
    const dir = tempDir();
    const first = prepareJudgeFiles({ rawRows: pilot, bank, dir, seedText: 'pilot' });
    const keyBefore = fs.readFileSync(path.join(dir, 'key.csv'), 'utf8');
    assert.equal(prepareJudgeFiles({ rawRows: pilot, bank, dir, seedText: 'pilot' }).length, 0);
    const second = prepareJudgeFiles({ rawRows: main, bank, dir, seedText: 'main' });
    assert.equal(second.length, 12);
    assert.ok(fs.readFileSync(path.join(dir, 'key.csv'), 'utf8').startsWith(keyBefore));
    assert.equal(new Set([...first, ...second].map((r) => r.id)).size, 24);
  });

  test('error rows get no judge file', async () => {
    const ok = await fakeRun();
    const i = ok.findIndex((r) => r.taskId === 'K3-026');
    const rawRows = ok.map((r, j) => (j === i ? { ...r, status: 'error', text: null } : r));
    const added = prepareJudgeFiles({ rawRows, bank, dir: tempDir(), seedText: 'x' });
    assert.equal(added.length, 11);
    assert.ok(!added.some((r) => r.key === rawRows[i].key));
  });
});

describe('interpreting a claude -p answer', () => {
  test('a valid answer', () => {
    assert.deepEqual(interpretCall(result({ score: 1, justification: 'Üks arv on valesti.' })), {
      kind: 'ok', score: 1, justification: 'Üks arv on valesti.', model: JUDGE_MODEL,
    });
  });

  test('invalid answers → a new attempt', () => {
    const cases = [
      { exitCode: 0, stdout: 'not json', stderr: '', timedOut: false },
      result({ score: 3 }),
      result({ score: '2' }),
      result({ score: 1.5 }),
      { ...result(), stdout: JSON.stringify({ is_error: false, modelUsage: { [JUDGE_MODEL]: {} }, result: 'Ma ei hinda.' }) },
      { ...result(), exitCode: 1, stdout: JSON.stringify({ is_error: true, subtype: 'error_max_structured_output_retries', modelUsage: {} }) },
    ];
    for (const c of cases) assert.equal(interpretCall(c).kind, 'invalid', c.stdout);
  });

  test('an answer from another model is invalid: the judge must be Opus 5.5, never a compared model', () => {
    for (const model of ['claude-sonnet-5-5', 'claude-opus-5', 'claude-opus-4-8']) {
      const r = interpretCall(result({ model }));
      assert.equal(r.kind, 'invalid');
      assert.match(r.reason, new RegExp(model));
    }
    const two = result();
    two.stdout = JSON.stringify({ ...JSON.parse(two.stdout), modelUsage: { [JUDGE_MODEL]: {}, 'claude-opus-5': {} } });
    assert.equal(interpretCall(two).kind, 'invalid');
  });

  test('usage limit (in the result or on stderr) → wait, not an invalid answer', () => {
    const inResult = { exitCode: 1, stderr: '', timedOut: false, stdout: JSON.stringify({ is_error: true, subtype: 'success', result: "You've hit your session limit · resets 3:45pm" }) };
    assert.deepEqual(interpretCall(inResult), { kind: 'usage_limit', message: "You've hit your session limit · resets 3:45pm" });
    const onStderr = { exitCode: 1, stdout: '', stderr: "Error\nYou've hit your weekly limit · resets Mon 12:00am\n", timedOut: false };
    assert.equal(interpretCall(onStderr).kind, 'usage_limit');
  });

  test('other failures of the call → error (retried, then the run stops)', () => {
    assert.equal(interpretCall({ exitCode: 1, stdout: '', stderr: 'connect ECONNREFUSED', timedOut: false }).kind, 'error');
    assert.equal(interpretCall({ exitCode: 1, stdout: JSON.stringify({ is_error: true, subtype: 'success', result: 'API Error: 529 Overloaded' }), stderr: '', timedOut: false }).kind, 'error');
  });

  test('the reset time of the usage limit message', () => {
    const at = (s) => new Date(s);
    assert.equal(usageLimitWaitMs('resets 3:45pm', at('2026-11-20T14:00:00')), (105 + 1) * 60_000);
    assert.equal(usageLimitWaitMs('resets 3:45pm', at('2026-11-20T16:00:00')), (23 * 60 + 45 + 1) * 60_000);
    assert.equal(usageLimitWaitMs('resets 12am', at('2026-11-20T23:30:00')), (30 + 1) * 60_000);
    // 20.11.2026 is a Friday; the next Monday 00:00 is 23.11.
    assert.equal(usageLimitWaitMs('resets Mon 12:00am', at('2026-11-20T12:00:00')), (2 * 24 + 12) * 3_600_000 + 60_000);
    assert.equal(usageLimitWaitMs('resets soon', at('2026-11-20T12:00:00')), null);
  });
});

describe('scoring the files (run)', () => {
  // A judge set with n files and a scripted callJudge.
  async function setup(n = 2) {
    const dir = tempDir();
    const rawRows = await fakeRun('pilot', ['K3-026']);
    prepareJudgeFiles({ rawRows: rawRows.slice(0, n), bank, dir, seedText: 'pilot' });
    return dir;
  }
  const scripted = (responses) => {
    const inputs = [];
    let i = 0;
    return { inputs, call: async (input) => (inputs.push(input), responses[Math.min(i++, responses.length - 1)]) };
  };
  const options = { claudeCodeVersion: '2.1.317 (Claude Code)', sleep: noWait, now: () => new Date('2026-11-20T10:00:00Z') };

  test('3 separate calls per file with the same input; every score is stored', async () => {
    const dir = await setup(2);
    const judge = scripted([result({ score: 2 })]);
    const { added, stop } = await runJudge({ dir, callJudge: judge.call, ...options });
    assert.equal(stop, null);
    assert.equal(added.length, 6);
    assert.equal(judge.inputs.length, 6);
    assert.equal(new Set(judge.inputs.slice(0, 3)).size, 1);
    assert.deepEqual(readScores(dir)[0], {
      id: added[0].id, repeat: 1, score: 2, justification: 'Põhjendus.', model: JUDGE_MODEL,
      claudeCodeVersion: '2.1.317 (Claude Code)', ts: '2026-11-20T10:00:00.000Z', invalidAttempts: [],
    });
    assert.deepEqual(added.map((r) => r.repeat), [1, 2, 3, 1, 2, 3]);
  });

  test('an interrupted run resumes: stored (ID, repeat) pairs are not scored again', async () => {
    const dir = await setup(2);
    const first = await runJudge({ dir, callJudge: scripted([result()]).call, ...options, shouldStop: (() => { let n = 0; return () => n++ >= 4; })() });
    assert.deepEqual(first.stop, { reason: 'interrupted' });
    assert.equal(first.added.length, 4);
    const second = await runJudge({ dir, callJudge: scripted([result()]).call, ...options });
    assert.equal(second.added.length, 2);
    assert.equal(new Set(readScores(dir).map((s) => `${s.id}|${s.repeat}`)).size, 6);
    assert.equal((await runJudge({ dir, callJudge: scripted([result()]).call, ...options })).added.length, 0);
  });

  test('invalid twice, then valid → the score is stored with the two reasons', async () => {
    const dir = await setup(1);
    const judge = scripted([result({ score: 5 }), result({ model: 'claude-opus-5' }), result({ score: 0 })]);
    const { added } = await runJudge({ dir, callJudge: judge.call, ...options, limit: 1 });
    assert.equal(added[0].score, 0);
    assert.equal(added[0].invalidAttempts.length, 2);
  });

  test('3 invalid in a row → the score is stored as missing (null) and the run goes on', async () => {
    const dir = await setup(1);
    const judge = scripted([result({ score: 7 }), result({ score: 7 }), result({ score: 7 }), result({ score: 1 })]);
    const { added, stop } = await runJudge({ dir, callJudge: judge.call, ...options });
    assert.equal(stop, null);
    assert.equal(added[0].score, null);
    assert.equal(added[0].justification, null);
    assert.equal(added[0].invalidAttempts.length, 3);
    assert.deepEqual(added.slice(1).map((r) => r.score), [1, 1]);
  });

  test('usage limit → waits until the reset time and tries again; no invalid attempt', async () => {
    const dir = await setup(1);
    const waits = [];
    const limit = { exitCode: 1, stderr: '', timedOut: false, stdout: JSON.stringify({ is_error: true, result: "You've hit your session limit · resets 3:45pm" }) };
    const judge = scripted([limit, limit, result({ score: 2 })]);
    const { added } = await runJudge({
      dir, callJudge: judge.call, ...options, limit: 1, now: () => new Date('2026-11-20T15:00:00'), sleep: async (ms) => waits.push(ms),
    });
    assert.deepEqual(waits, [46 * 60_000, 46 * 60_000]);
    assert.equal(added[0].score, 2);
    assert.deepEqual(added[0].invalidAttempts, []);
    const unreadable = { ...limit, stdout: JSON.stringify({ is_error: true, result: "You've hit your Opus limit" }) };
    const waits2 = [];
    await runJudge({ dir: await setup(1), callJudge: scripted([unreadable, result()]).call, ...options, limit: 1, sleep: async (ms) => waits2.push(ms) });
    assert.deepEqual(waits2, [USAGE_LIMIT_POLL_MS]);
  });

  test('a call that keeps failing → waits 10/30/60 s, then the run stops and stores nothing for it', async () => {
    const dir = await setup(1);
    const waits = [];
    const down = { exitCode: 1, stdout: '', stderr: 'getaddrinfo ENOTFOUND api.anthropic.com', timedOut: false };
    const { added, stop } = await runJudge({ dir, callJudge: scripted([down]).call, ...options, sleep: async (ms) => waits.push(ms) });
    assert.deepEqual(waits, ERROR_WAITS_MS);
    assert.equal(added.length, 0);
    assert.equal(stop.reason, 'errors');
    assert.equal(readScores(dir).length, 0);
  });

  test('a failure that goes away does not count as an invalid answer', async () => {
    const dir = await setup(1);
    const down = { exitCode: 1, stdout: '', stderr: 'ECONNRESET', timedOut: false };
    const { added } = await runJudge({ dir, callJudge: scripted([down, result({ score: 1 })]).call, ...options, limit: 1 });
    assert.equal(added[0].score, 1);
    assert.deepEqual(added[0].invalidAttempts, []);
  });

  test('--limit N scores at most N files', async () => {
    const dir = await setup(3);
    const { added, stop } = await runJudge({ dir, callJudge: scripted([result()]).call, ...options, limit: 2 });
    assert.equal(new Set(added.map((r) => r.id)).size, 2);
    assert.deepEqual(stop, { reason: 'limit' });
  });
});

describe('judge correctness joined to the score rows', () => {
  test('median of the three scores: 0 → 0, 1 → 0.5, 2 → 1', () => {
    assert.equal(median([2, 2, 1]), 2);
    assert.equal(median([0, 1, 2]), 1);
    assert.equal(median([2, 1]), 1.5);
    assert.equal(median([]), null);
  });

  test('dry run end to end: pipeline → judge files → fake judge → score rows', async () => {
    const rawRows = await fakeRun();
    const dir = tempDir();
    prepareJudgeFiles({ rawRows, bank, dir, seedText: 'pilot' });
    await runJudge({ dir, callJudge: createFakeJudge(), expectedModel: FAKE_MODEL, claudeCodeVersion: 'fake', sleep: noWait });
    const scores = readScores(dir);
    assert.equal(scores.length, 12 * 3);
    assert.ok(scores.every((s) => [0, 1, 2].includes(s.score) && s.model === FAKE_MODEL));

    const judged = judgeCorrectnessByKey(dir);
    const { rows, judgeMissing } = scoreRawRows(rawRows, createScorer(bank), judged);
    assert.equal(judgeMissing, 0);
    const key = readKey(dir);
    for (const row of rows.filter((r) => r.scoringMethod === 'judge')) {
      const id = key.find((k) => k.key === row.key).id;
      const own = scores.filter((s) => s.id === id).map((s) => s.score);
      assert.equal(row.correctness, median(own) / 2);
    }
    assert.ok(rows.filter((r) => r.scoringMethod === 'rules').every((r) => r.correctness !== null));
  });

  test('missing scores: the median of the valid ones; none → null; not judged yet → null', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'key.csv'), 'id,key\nH0001,r|K3-026|openai|1\nH0002,r|K3-026|google|1\nH0003,r|K3-026|xai|1\n');
    const line = (id, repeat, score) => JSON.stringify({ id, repeat, score }) + '\n';
    fs.writeFileSync(scoresFile(dir), [
      line('H0001', 1, 2), line('H0001', 2, null), line('H0001', 3, 1),
      line('H0002', 1, null), line('H0002', 2, null), line('H0002', 3, null),
    ].join(''));
    const j = judgeCorrectnessByKey(dir);
    assert.deepEqual(j.get('r|K3-026|openai|1'), { correctness: 0.75, validScores: 2 });
    assert.deepEqual(j.get('r|K3-026|google|1'), { correctness: null, validScores: 0 });
    assert.deepEqual(j.get('r|K3-026|xai|1'), { correctness: null, validScores: 0 });
  });
});
