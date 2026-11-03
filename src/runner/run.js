// Measurement pipeline: sends the tasks named in the run config to the models and stores
// every request as a raw row in results/raw/<runId>.jsonl.
//
//   node src/runner/run.js --config config/run.pilot.json [--dry-run] [--limit N]
//
//   --dry-run  every model uses the fake adapter: no API requests and no keys; the rows go to
//              results/dry-run/<runId>.jsonl, never into results/raw
//   --limit N  make at most N new requests in this run (rows already stored are not counted)
//
// Order: the outer loop is the repeat, the inner loop is tasks × models [M7].
// Keys already stored are not requested again, so an interrupted run can simply be restarted.
// Temporary errors are retried (retry.js) [PK1]. The run stops after 5 error rows in a row, overall
// or for one model (author's decision 3.11.2026), so that an outage or an empty account does not turn
// the rest of the run into error rows. Ctrl+C stops after the current request, so that a request
// already sent is still logged [PK9]; a second Ctrl+C stops at once.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { config as loadEnv } from 'dotenv';
import { createAdapter } from '../adapters/index.js';
import { loadTaskBank, buildUserMessage } from '../taskBank.js';
import { buildRawRow, appendRawRow, existingKeys, rawRowKey } from './rawRows.js';
import { RETRY_WAITS_MS, sendWithRetry } from './retry.js';

export const ROOT = new URL('../../', import.meta.url);
export const MAX_CONSECUTIVE_ERRORS = 5;
const readJson = (url) => JSON.parse(fs.readFileSync(url, 'utf8'));

// Run config: { runId, description, models: [id...], tasks: "all" | [id...], repeats }
export function buildPlan(run, modelConfig, bank) {
  if (!/^[\w.-]+$/.test(run.runId ?? '')) throw new Error(`Invalid runId: ${run.runId}`);
  if (!Number.isInteger(run.repeats) || run.repeats < 1) throw new Error('repeats must be a positive integer');

  const allModels = new Map(modelConfig.models.map((m) => [m.id, m]));
  const models = run.models.map((id) => {
    const m = allModels.get(id);
    if (!m) throw new Error(`Model "${id}" is not in config/models.json`);
    return m;
  });

  const allTasks = new Map(bank.tasks.map((t) => [t.id, t]));
  const tasks = run.tasks === 'all'
    ? bank.tasks
    : run.tasks.map((id) => {
      const t = allTasks.get(id);
      if (!t) throw new Error(`Task "${id}" is not in the task bank`);
      return t;
    });

  const requests = [];
  for (let repeat = 1; repeat <= run.repeats; repeat++) {
    for (const task of tasks) {
      for (const model of models) requests.push({ repeat, task, model });
    }
  }
  return { models, requests };
}

// adapters: Map model id → send(message, { signal }).
// Returns { added, stop }: the rows added in this run, and why the run stopped before the end of the
// plan: null (the plan is done), { reason: 'limit' }, { reason: 'interrupted' } or
// { reason: 'errors', count, modelId } (modelId only when the error rows in a row were for one model).
export async function executePlan({
  run, plan, bank, outputFile, adapters,
  limit = Infinity,
  maxConsecutiveErrors = MAX_CONSECUTIVE_ERRORS,
  retryOptions = {},
  shouldStop = () => false,
  log = () => {},
  logRetry = () => {},
}) {
  const done = existingKeys(outputFile);
  const added = [];
  let errorsInRow = 0;
  const errorsInRowByModel = new Map();
  for (const { repeat, task, model } of plan.requests) {
    const base = { runId: run.runId, taskId: task.id, model, repeat };
    const key = rawRowKey({ ...base, modelId: model.id });
    if (done.has(key)) continue;
    if (added.length >= limit) return { added, stop: { reason: 'limit' } };
    if (shouldStop()) return { added, stop: { reason: 'interrupted' } };

    const message = buildUserMessage(task, bank);
    const outcome = await sendWithRetry(adapters.get(model.id), message, {
      ...retryOptions,
      onRetry: (info) => logRetry({ key, ...info }),
    });
    const row = buildRawRow({
      ...base,
      tsStartUtc: outcome.tsStartUtc,
      retries: outcome.retries,
      result: outcome.result ?? null,
      error: outcome.error ?? null,
    });
    appendRawRow(outputFile, row);
    added.push(row);
    log(row);

    if (row.status === 'error') {
      errorsInRow += 1;
      const forModel = (errorsInRowByModel.get(model.id) ?? 0) + 1;
      errorsInRowByModel.set(model.id, forModel);
      if (errorsInRow >= maxConsecutiveErrors) return { added, stop: { reason: 'errors', count: errorsInRow } };
      if (forModel >= maxConsecutiveErrors) {
        return { added, stop: { reason: 'errors', count: forModel, modelId: model.id } };
      }
    } else {
      errorsInRow = 0;
      errorsInRowByModel.set(model.id, 0);
    }
  }
  return { added, stop: null };
}

// Normalization check: if the provider reports a total, input + output must match it.
export function usageTotalMatches(row) {
  const total = row.usageRaw?.total_tokens ?? row.usageRaw?.totalTokenCount;
  if (typeof total !== 'number' || row.usage?.input == null || row.usage?.output == null) return null;
  return row.usage.input + row.usage.output === total;
}

function summarizeRow(r) {
  const retries = r.retries?.length ? `retries=${r.retries.length}` : '';
  if (r.status === 'error') {
    return [`${r.key}  ERROR ${r.error.httpStatus ?? '-'}: ${r.error.message}`, retries].filter(Boolean).join('  ');
  }
  const u = r.usage;
  const matches = usageTotalMatches(r);
  return [
    r.key,
    `model=${r.modelVersion}`,
    `finish=${r.finishReason}`,
    `ttft=${r.ttftMs === null ? '-' : r.ttftMs.toFixed(0)}ms`,
    `total=${r.totalMs.toFixed(0)}ms`,
    `tokens in=${u.input} cached=${u.cachedInput} out=${u.output} reasoning=${u.reasoning}`,
    matches === null ? '' : `sum ${matches ? 'matches' : 'DOES NOT MATCH'}`,
    retries,
    `text=${JSON.stringify(r.text.length > 60 ? r.text.slice(0, 60) + '…' : r.text)}`,
  ].filter(Boolean).join('  ');
}

// Command line: --config <file> (required), --dry-run, --limit N (positive integer).
export function parseCommandLine(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      limit: { type: 'string' },
    },
  });
  if (!values.config) throw new Error('Usage: node src/runner/run.js --config config/run.<name>.json [--dry-run] [--limit N]');
  if (values.limit !== undefined && !/^[1-9]\d*$/.test(values.limit)) {
    throw new Error(`--limit must be a positive integer, not "${values.limit}"`);
  }
  return {
    configFile: values.config,
    dryRun: values['dry-run'],
    limit: values.limit === undefined ? Infinity : Number(values.limit),
  };
}

export const outputFileFor = (runId, { dryRun }) =>
  fileURLToPath(new URL(`results/${dryRun ? 'dry-run' : 'raw'}/${runId}.jsonl`, ROOT));

async function main() {
  let args;
  try {
    args = parseCommandLine(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const run = JSON.parse(fs.readFileSync(args.configFile, 'utf8'));
  const modelConfig = readJson(new URL('config/models.json', ROOT));
  const bank = loadTaskBank();
  const plan = buildPlan(run, modelConfig, bank);

  let adapters;
  if (args.dryRun) {
    adapters = new Map(plan.models.map((m) => [m.id, createAdapter({ ...m, adapter: 'fake' })]));
  } else {
    // Keys are read only from .env, not from the system environment, so that no other
    // (e.g. personal) key can be used by accident and the billing check adds up [PK9].
    const keys = {};
    loadEnv({ path: fileURLToPath(new URL('.env', ROOT)), quiet: true, processEnv: keys });
    adapters = new Map(
      plan.models.map((m) => [m.id, createAdapter(m, { env: keys, maxOutputTokens: modelConfig.maxOutputTokens })]),
    );
  }
  const outputFile = outputFileFor(run.runId, args);

  let stopRequested = false;
  process.on('SIGINT', () => {
    if (stopRequested) process.exit(130);
    stopRequested = true;
    console.log('Stopping after the current request. Ctrl+C again stops at once (that request is then not logged).');
  });

  const mode = args.dryRun ? ' DRY RUN (fake adapter, no API requests)' : '';
  console.log(`${run.runId}${mode}: ${plan.requests.length} requests planned → ${outputFile}`);
  const { added, stop } = await executePlan({
    run, plan, bank, outputFile, adapters,
    limit: args.limit,
    shouldStop: () => stopRequested,
    log: (r) => console.log(summarizeRow(r)),
    logRetry: ({ key, retry, error, waitMs }) => console.log(
      `${key}  retry ${retry}/${RETRY_WAITS_MS.length} in ${waitMs / 1000} s after: ${error.status ?? '-'} ${error.message}`,
    ),
  });

  const stored = existingKeys(outputFile);
  const remaining = plan.requests.filter(
    (p) => !stored.has(rawRowKey({ runId: run.runId, taskId: p.task.id, modelId: p.model.id, repeat: p.repeat })),
  ).length;
  const errors = added.filter((r) => r.status === 'error').length;
  console.log(`Done: ${added.length} new rows, ${errors} errors. ${remaining} of ${plan.requests.length} requests still to do.`);
  if (stop?.reason === 'errors') {
    const who = stop.modelId ? ` to model "${stop.modelId}"` : '';
    console.error(
      `Stopped: the last ${stop.count} requests${who} ended in an error. ` +
      'Check the connection and the provider account, then run the same command again to continue.',
    );
    process.exitCode = 1;
  } else if (stop?.reason === 'interrupted') {
    process.exitCode = 130;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
