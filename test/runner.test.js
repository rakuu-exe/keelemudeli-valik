// Tests of the measurement pipeline with the fake adapter: raw row shape, order, resuming, retries,
// --limit, stopping, and the run configs. No network requests are made.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdapter, ApiError } from '../src/adapters/index.js';
import { loadTaskBank, buildUserMessage } from '../src/taskBank.js';
import { buildPlan, executePlan, outputFileFor, parseCommandLine, usageTotalMatches } from '../src/runner/run.js';
import { buildRawRow, readRawRows, rawRowKey } from '../src/runner/rawRows.js';
import { RETRY_WAITS_MS, REQUEST_TIMEOUT_MS, sendWithRetry } from '../src/runner/retry.js';

const bank = loadTaskBank();
const readConfig = (name) => JSON.parse(fs.readFileSync(new URL(`../config/${name}`, import.meta.url), 'utf8'));
const MODELS = readConfig('models.json');
const RAW_ROW_FIELDS = [
  'key', 'runId', 'taskId', 'modelId', 'modelRequested', 'modelVersion', 'repeat', 'tsStartUtc',
  'ttftMs', 'totalMs', 'status', 'error', 'retries', 'finishReason', 'usage', 'usageRaw', 'text',
];
const COMPARED = ['openai', 'anthropic', 'google', 'deepseek', 'xai'];
const JUDGE_TASKS = ['K3-026', 'K3-027', 'K3-028', 'K3-031', 'K3-033', 'K3-035', 'K3-037', 'K3-039'];
const temporary = (status = 429) => new ApiError(`HTTP ${status}`, { status, retryable: true });
const noWait = { sleep: async () => {} };

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
    assert.deepEqual(row.retries, []);
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

    const second = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan) });
    assert.equal(second.added.length, 8);
    assert.equal(second.stop, null);
    const rows = readRawRows(file);
    assert.equal(rows.length, 12);
    assert.equal(new Set(rows.map((r) => r.key)).size, 12);

    const third = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan) });
    assert.equal(third.added.length, 0);
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

describe('retries [PK1]', () => {
  const okResult = { text: 'Tallinn' };
  // send() that fails with the given errors in turn, then answers.
  const failingThen = (errors) => {
    let n = 0;
    const send = async () => {
      if (n < errors.length) throw errors[n++];
      n++;
      return okResult;
    };
    return { send, calls: () => n };
  };

  test('the decided timeout and waits: 10 min; 10 s, 30 s, 60 s', () => {
    assert.equal(REQUEST_TIMEOUT_MS, 600_000);
    assert.deepEqual(RETRY_WAITS_MS, [10_000, 30_000, 60_000]);
  });

  test('temporary error twice, then an answer → ok; both failed attempts are kept; increasing waits', async () => {
    const waits = [];
    const { send, calls } = failingThen([temporary(429), temporary(503)]);
    const out = await sendWithRetry(send, 'm', { sleep: async (ms) => waits.push(ms) });
    assert.equal(out.result, okResult);
    assert.equal(calls(), 3);
    assert.deepEqual(waits, [10_000, 30_000]);
    assert.deepEqual(out.retries.map((r) => [r.httpStatus, r.message]), [[429, 'HTTP 429'], [503, 'HTTP 503']]);
  });

  test('temporary error 4 times → error after 3 retries (4 attempts in total)', async () => {
    const waits = [];
    const { send, calls } = failingThen([temporary(), temporary(), temporary(), temporary(500)]);
    const out = await sendWithRetry(send, 'm', { sleep: async (ms) => waits.push(ms) });
    assert.equal(out.error.status, 500);
    assert.equal(calls(), 4);
    assert.deepEqual(waits, [10_000, 30_000, 60_000]);
    assert.equal(out.retries.length, 3);
  });

  test('error that is not temporary (e.g. 400, 401) → no retry', async () => {
    const { send, calls } = failingThen([new ApiError('Bad request', { status: 400, retryable: false })]);
    const out = await sendWithRetry(send, 'm', noWait);
    assert.equal(out.error.status, 400);
    assert.equal(calls(), 1);
    assert.deepEqual(out.retries, []);
  });

  test('timeout: the hanging attempt is aborted through the signal and retried', async () => {
    let attempts = 0;
    const send = (_, { signal }) => {
      attempts++;
      if (attempts === 3) return Promise.resolve(okResult);
      // Rejects with a plain Error, as an SDK might: it still becomes a retryable timeout.
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
    };
    const out = await sendWithRetry(send, 'm', { ...noWait, timeoutMs: 20 });
    assert.equal(out.result, okResult);
    assert.deepEqual(out.retries.map((r) => [r.httpStatus, r.message]), [
      [null, 'Timeout: no complete answer within 0.02 s'],
      [null, 'Timeout: no complete answer within 0.02 s'],
    ]);
  });

  test('timeout: an answer that ends quietly after the abort (as the OpenAI SDK does) is not a result', async () => {
    const send = (_, { signal }) =>
      new Promise((resolve) => signal.addEventListener('abort', () => resolve({ text: 'Tal' })));
    const out = await sendWithRetry(send, 'm', { ...noWait, timeoutMs: 10, waitsMs: [] });
    assert.equal(out.result, undefined);
    assert.match(out.error.message, /^Timeout/);
    assert.equal(out.error.retryable, true);
  });

  test('tsStartUtc is the start of the last attempt (the DeepSeek price depends on it)', async () => {
    const times = ['2026-11-20T09:59:50.000Z', '2026-11-20T10:00:05.000Z'];
    let i = 0;
    const { send } = failingThen([temporary()]);
    const out = await sendWithRetry(send, 'm', { ...noWait, now: () => new Date(times[i++]) });
    assert.equal(out.tsStartUtc, times[1]);
    assert.equal(out.retries[0].tsStartUtc, times[0]);
  });

  test('a programming error (not an ApiError) is not retried and not hidden', async () => {
    const send = async () => { throw new TypeError('x is not a function'); };
    await assert.rejects(sendWithRetry(send, 'm', noWait), TypeError);
  });
});

describe('pipeline: retries, --limit and stopping', () => {
  const run = { runId: 'test', models: ['openai', 'anthropic', 'google'], tasks: 'all', repeats: 1 };
  const plan = buildPlan(run, MODELS, bank);
  const execute = (options) => executePlan({ run, plan, bank, outputFile: tempFile(), retryOptions: noWait, ...options });

  test('the failed attempts are stored in the row with the final answer', async () => {
    let failed = false;
    const adapters = fakeAdapters(plan, {
      fail: (_, m) => (m.id === 'google' && !failed ? ((failed = true), temporary(503)) : null),
    });
    const { added } = await execute({ adapters, limit: 3 });
    const google = added.find((r) => r.modelId === 'google');
    assert.equal(google.status, 'ok');
    assert.deepEqual(google.retries.map((r) => r.httpStatus), [503]);
    assert.ok(added.filter((r) => r.modelId !== 'google').every((r) => r.retries.length === 0));
  });

  test('--limit N: at most N new requests; rows already stored are not counted', async () => {
    const file = tempFile();
    const first = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan), limit: 4 });
    assert.equal(first.added.length, 4);
    assert.deepEqual(first.stop, { reason: 'limit' });
    const second = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan), limit: 4 });
    assert.equal(second.added.length, 4);
    assert.deepEqual(second.added.map((r) => r.key), plan.requests.slice(4, 8).map((p) => rawRowKey({
      runId: 'test', taskId: p.task.id, modelId: p.model.id, repeat: p.repeat,
    })));
    const rest = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan) });
    assert.equal(rest.added.length, plan.requests.length - 8);
    assert.equal(rest.stop, null);
    assert.equal(new Set(readRawRows(file).map((r) => r.key)).size, plan.requests.length);
  });

  test('a limit equal to what is left is not reported as a stop', async () => {
    const file = tempFile();
    await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan), limit: plan.requests.length - 2 });
    const last = await executePlan({ run, plan, bank, outputFile: file, adapters: fakeAdapters(plan), limit: 2 });
    assert.equal(last.added.length, 2);
    assert.equal(last.stop, null);
  });

  test('5 error rows in a row → the run stops (e.g. the connection is down)', async () => {
    const adapters = fakeAdapters(plan, { fail: () => temporary(503) });
    const { added, stop } = await execute({ adapters });
    assert.equal(added.length, 5);
    assert.ok(added.every((r) => r.status === 'error' && r.retries.length === 3));
    assert.deepEqual(stop, { reason: 'errors', count: 5 });
  });

  test('5 error rows in a row for one model → the run stops, even when the others answer (e.g. its balance ran out)', async () => {
    const adapters = fakeAdapters(plan, {
      fail: (_, m) => (m.id === 'google' ? new ApiError('Insufficient balance', { status: 402 }) : null),
    });
    const { added, stop } = await execute({ adapters });
    assert.equal(added.length, 5 * 3); // 5 tasks × 3 models
    assert.deepEqual(stop, { reason: 'errors', count: 5, modelId: 'google' });
  });

  test('an answer resets the count, so scattered errors do not stop the run', async () => {
    let n = 0;
    const adapters = fakeAdapters(plan, {
      fail: (_, m) => (m.id === 'google' && n++ % 2 === 0 ? new ApiError('Bad request', { status: 400 }) : null),
    });
    const { added, stop } = await execute({ adapters });
    assert.equal(added.length, plan.requests.length);
    assert.equal(stop, null);
  });

  test('Ctrl+C (shouldStop): the current request is stored, then the run stops', async () => {
    let stopRequested = false;
    const adapters = fakeAdapters(plan, { respond: () => ((stopRequested = true), 'Tallinn') });
    const { added, stop } = await execute({ adapters, shouldStop: () => stopRequested });
    assert.equal(added.length, 1);
    assert.deepEqual(stop, { reason: 'interrupted' });
  });
});

describe('run configs', () => {
  const plan = (name) => buildPlan(readConfig(name), MODELS, bank);

  test('probe: 1 task × 5 models', () => {
    assert.equal(plan('run.probe.json').requests.length, 5);
  });

  test('pilot run: 5 models × 120 tasks × 1 = 600 requests [L5]', () => {
    const p = plan('run.pilot.json');
    assert.deepEqual(p.models.map((m) => m.id), COMPARED);
    assert.equal(p.requests.length, 600);
  });

  test('main run: 5 × 120 × 5 = 3000 requests in rounds [PK4, M7]', () => {
    const p = plan('run.main.json');
    assert.deepEqual(p.models.map((m) => m.id), COMPARED);
    assert.equal(p.requests.length, 3000);
    // Round 1 (all tasks for all models) comes before round 2.
    assert.ok(p.requests.slice(0, 600).every((r) => r.repeat === 1));
    assert.ok(p.requests.slice(600, 1200).every((r) => r.repeat === 2));
  });

  test('Luna: only the sixth model; 9 rule-scored tasks, one per category × difficulty; 5 repeats [M13]', () => {
    const p = plan('run.luna.json');
    assert.deepEqual(p.models.map((m) => [m.id, m.model]), [['luna', 'gpt-6-luna']]);
    assert.equal(p.requests.length, 45);
    const tasks = [...new Map(p.requests.map((r) => [r.task.id, r.task])).values()];
    assert.equal(tasks.length, 9);
    assert.ok(tasks.every((t) => t.check.type !== 'judge' && !JUDGE_TASKS.includes(t.id)));
    assert.deepEqual(
      tasks.map((t) => `${t.category}/${t.difficulty}`).sort(),
      ['1/1', '1/3', '1/5', '2/1', '2/3', '2/5', '3/1', '3/3', '3/5'],
    );
  });

  test('the compared runs do not include Luna', () => {
    for (const name of ['run.probe.json', 'run.pilot.json', 'run.main.json']) {
      assert.ok(!readConfig(name).models.includes('luna'), name);
    }
  });
});

describe('command line', () => {
  test('--config is required; --dry-run and --limit N are optional', () => {
    assert.deepEqual(parseCommandLine(['--config', 'c.json']), { configFile: 'c.json', dryRun: false, limit: Infinity });
    assert.deepEqual(parseCommandLine(['--config', 'c.json', '--dry-run', '--limit', '10']), {
      configFile: 'c.json', dryRun: true, limit: 10,
    });
    assert.throws(() => parseCommandLine([]), /Usage/);
    for (const bad of ['0', '-1', '1.5', 'x']) {
      assert.throws(() => parseCommandLine(['--config', 'c.json', `--limit=${bad}`]), /positive integer/);
    }
    assert.throws(() => parseCommandLine(['--config', 'c.json', '--unknown']));
  });

  test('a dry run never writes into results/raw (it uses results/dry-run/raw)', () => {
    const raw = outputFileFor('pilot', { dryRun: false });
    const dry = outputFileFor('pilot', { dryRun: true });
    const results = path.dirname(path.dirname(raw));
    assert.equal(path.basename(results), 'results');
    assert.equal(raw, path.join(results, 'raw', 'pilot.jsonl'));
    assert.equal(dry, path.join(results, 'dry-run', 'raw', 'pilot.jsonl'));
  });

  test('results/dry-run is ignored by git', () => {
    const gitignore = fs.readFileSync(fileURLToPath(new URL('../.gitignore', import.meta.url)), 'utf8');
    assert.match(gitignore, /^results\/dry-run\/$/m);
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
