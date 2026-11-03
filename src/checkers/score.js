// Scoring (PLAN.md phases 3 and 3b): every raw row with status ok gets one score row.
//
//   node src/checkers/score.js --run <runId> [--dry-run]
//     reads  results/raw/<runId>.jsonl and the judge set results/judge/
//     writes results/scored/<runId>.jsonl
//     (--dry-run: the same under results/dry-run/)
//
// Error rows are not scored (principle 8). The score file is derived data: it is written again from
// the raw rows and the judge scores on every run (measure once, compute many times). The 8 judge
// tasks get their format from the rules and their correctness from the judge: the median of the
// three scores, 0 → 0, 1 → 0.5, 2 → 1 (null while the answer has no judge scores yet).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadTaskBank } from '../taskBank.js';
import { readRawRows } from '../runner/rawRows.js';
import { judgeDir, rawFile, scoredFile } from '../paths.js';
import { judgeCorrectnessByKey } from '../judge/common.js';
import { createSchemaValidators } from './schemas.js';
import { scoreK1 } from './k1.js';
import { scoreK2 } from './k2.js';
import { scoreK3 } from './k3.js';

// Returns scoreAnswer(taskId, text) →
//   { task, scoringMethod, format, correctness, nullViolations, details }
// details (which rule or field failed, the normalized answer) is for the manual check only.
export function createScorer(bank) {
  const tasks = new Map(bank.tasks.map((t) => [t.id, t]));
  const validatorFor = createSchemaValidators(bank);
  return function scoreAnswer(taskId, text) {
    const task = tasks.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" is not in the task bank`);
    if (typeof text !== 'string') throw new Error(`${taskId}: the answer is not text`);
    let result;
    if (task.category === 1) result = { ...scoreK1(task, text), nullViolations: null };
    else if (task.category === 2) result = scoreK2(task, text, validatorFor(task.id));
    else if (task.category === 3) result = { ...scoreK3(task, text, bank), nullViolations: null };
    else throw new Error(`${taskId}: unknown category ${task.category}`);
    return { task, scoringMethod: task.check.type === 'judge' ? 'judge' : 'rules', ...result };
  };
}

// Score row (CLAUDE.md, "Score row").
export function buildScoreRow(raw, scored) {
  return {
    key: raw.key,
    taskId: raw.taskId,
    modelId: raw.modelId,
    repeat: raw.repeat,
    category: scored.task.category,
    scoringMethod: scored.scoringMethod,
    format: scored.format,
    correctness: scored.correctness,
    nullViolations: scored.nullViolations,
  };
}

// judged: raw row key → { correctness, validScores } from the judge set (judgeCorrectnessByKey).
// Returns { rows, skippedErrors, judgeMissing, judgeIncomplete }: one score row per ok raw row, in the
// order of the raw rows; judgeMissing = judge-task rows without any judge score yet,
// judgeIncomplete = judge-task rows with fewer than 3 valid scores.
export function scoreRawRows(rawRows, scoreAnswer, judged = new Map()) {
  const rows = [];
  let skippedErrors = 0;
  let judgeMissing = 0;
  let judgeIncomplete = 0;
  for (const raw of rawRows) {
    if (raw.status === 'error') {
      skippedErrors++;
      continue;
    }
    if (raw.status !== 'ok') throw new Error(`${raw.key}: unknown status "${raw.status}"`);
    const scored = scoreAnswer(raw.taskId, raw.text);
    if (scored.scoringMethod === 'judge') {
      const j = judged.get(raw.key);
      scored.correctness = j?.correctness ?? null;
      if (scored.correctness === null) judgeMissing++;
      else if (j.validScores < 3) judgeIncomplete++;
    }
    rows.push(buildScoreRow(raw, scored));
  }
  return { rows, skippedErrors, judgeMissing, judgeIncomplete };
}

export function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r) + '\n').join(''), 'utf8');
  fs.renameSync(tmp, file);
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (x) => (x === null ? '-' : x.toFixed(3));

// Console summary per model (not an analysis result; phase 7 computes the criteria).
function summarize(rows) {
  const byModel = new Map();
  for (const r of rows) {
    if (!byModel.has(r.modelId)) byModel.set(r.modelId, []);
    byModel.get(r.modelId).push(r);
  }
  const lines = ['model        rows  format  correctness  nullViolations'];
  for (const [modelId, rs] of byModel) {
    const correctness = rs.filter((r) => r.correctness !== null).map((r) => r.correctness);
    const counted = rs.filter((r) => r.nullViolations !== null);
    const violations = counted.length ? String(counted.reduce((a, r) => a + r.nullViolations, 0)) : '-';
    lines.push([
      modelId.padEnd(12), String(rs.length).padStart(4), fmt(mean(rs.map((r) => r.format))).padStart(7),
      fmt(mean(correctness)).padStart(12), violations.padStart(15),
    ].join(' '));
  }
  return lines.join('\n');
}

export function parseRunArgument(argv, extraOptions = {}) {
  const { values } = parseArgs({ args: argv, options: { run: { type: 'string' }, ...extraOptions } });
  if (!values.run || !/^[\w.-]+$/.test(values.run)) throw new Error('Usage: --run <runId>');
  return values;
}

function main() {
  let args;
  try {
    args = parseRunArgument(process.argv.slice(2), { 'dry-run': { type: 'boolean', default: false } });
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  const options = { dryRun: args['dry-run'] };
  const input = rawFile(args.run, options);
  if (!fs.existsSync(input)) throw new Error(`No raw rows: ${input}`);
  const bank = loadTaskBank();
  const judged = judgeCorrectnessByKey(judgeDir(options));
  const { rows, skippedErrors, judgeMissing, judgeIncomplete } = scoreRawRows(readRawRows(input), createScorer(bank), judged);
  const output = scoredFile(args.run, options);
  writeJsonl(output, rows);
  console.log(`${args.run}: ${rows.length} score rows → ${output} (${skippedErrors} error rows skipped)`);
  if (judgeMissing) console.log(`${judgeMissing} judge-task answers have no judge score yet (correctness null)`);
  if (judgeIncomplete) console.log(`${judgeIncomplete} judge-task answers have fewer than 3 valid judge scores`);
  console.log(summarize(rows));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
