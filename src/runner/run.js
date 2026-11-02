// Measurement pipeline: sends the tasks named in the run config to the models and stores
// every request as a raw row in results/raw/<runId>.jsonl.
//
//   node src/runner/run.js --config config/run.probe.json
//
// Order: the outer loop is the repeat, the inner loop is tasks × models [M7].
// Keys already stored are not requested again, so an interrupted run can simply be restarted.
// Retries on errors, --dry-run and --limit are added in phase 2.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createAdapter, ApiError } from '../adapters/index.js';
import { loadTaskBank, buildUserMessage } from '../taskBank.js';
import { buildRawRow, appendRawRow, existingKeys, rawRowKey } from './rawRows.js';

export const ROOT = new URL('../../', import.meta.url);
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

// adapters: Map model id → send(message). Returns the rows added in this run.
export async function executePlan({ run, plan, bank, outputFile, adapters, log = () => {} }) {
  const done = existingKeys(outputFile);
  const added = [];
  for (const { repeat, task, model } of plan.requests) {
    const base = { runId: run.runId, taskId: task.id, model, repeat };
    if (done.has(rawRowKey({ ...base, modelId: model.id }))) continue;

    const message = buildUserMessage(task, bank);
    const tsStartUtc = new Date().toISOString();
    let row;
    try {
      row = buildRawRow({ ...base, tsStartUtc, result: await adapters.get(model.id)(message) });
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      row = buildRawRow({ ...base, tsStartUtc, error: e });
    }
    appendRawRow(outputFile, row);
    added.push(row);
    log(row);
  }
  return added;
}

// Normalization check: if the provider reports a total, input + output must match it.
export function usageTotalMatches(row) {
  const total = row.usageRaw?.total_tokens ?? row.usageRaw?.totalTokenCount;
  if (typeof total !== 'number' || row.usage?.input == null || row.usage?.output == null) return null;
  return row.usage.input + row.usage.output === total;
}

function summarizeRow(r) {
  if (r.status === 'error') return `${r.key}  ERROR ${r.error.httpStatus ?? '-'}: ${r.error.message}`;
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
    `text=${JSON.stringify(r.text.length > 60 ? r.text.slice(0, 60) + '…' : r.text)}`,
  ].filter(Boolean).join('  ');
}

async function main() {
  const i = process.argv.indexOf('--config');
  if (i === -1 || !process.argv[i + 1]) {
    console.error('Usage: node src/runner/run.js --config config/run.<name>.json');
    process.exit(2);
  }
  // Keys are read only from .env, not from the system environment, so that no other
  // (e.g. personal) key can be used by accident and the billing check adds up [PK9].
  const keys = {};
  loadEnv({ path: fileURLToPath(new URL('.env', ROOT)), quiet: true, processEnv: keys });

  const run = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const modelConfig = readJson(new URL('config/models.json', ROOT));
  const bank = loadTaskBank();
  const plan = buildPlan(run, modelConfig, bank);
  const adapters = new Map(
    plan.models.map((m) => [m.id, createAdapter(m, { env: keys, maxOutputTokens: modelConfig.maxOutputTokens })]),
  );
  const outputFile = fileURLToPath(new URL(`results/raw/${run.runId}.jsonl`, ROOT));

  console.log(`${run.runId}: ${plan.requests.length} requests planned → ${outputFile}`);
  const added = await executePlan({ run, plan, bank, outputFile, adapters, log: (r) => console.log(summarizeRow(r)) });
  const errors = added.filter((r) => r.status === 'error').length;
  console.log(`Done: ${added.length} new rows, ${errors} errors. Skipped ${plan.requests.length - added.length} existing.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
