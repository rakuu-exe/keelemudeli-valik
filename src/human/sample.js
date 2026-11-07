// The sample of the human evaluation (PLAN.md phase 8.4, [M14]).
//
//   node src/human/sample.js [--run main]
//     writes results/human/sample.csv (answerId, sourceText, task, answer; no model name, shuffled)
//     and results/human/key.csv (answerId, key, scoringMethod; never given to the raters)
//
// 60 answers drawn with a fixed seed: 3 categories × 5 models × 4. Within one category and one model
// the 4 answers are to different tasks, each with a random repeat; in K3, 2 answers to rule-scored
// tasks and 2 to judge tasks. Only answers with a score row (an error row has none). The 60 answers
// are shuffled and numbered A01…A60 in that order, so the ID tells nothing about the model.
// The sample is fixed once it exists: the files are never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildUserMessage, loadTaskBank } from '../taskBank.js';
import { readRawRows } from '../runner/rawRows.js';
import { csvLine } from '../csv.js';
import { mulberry32, shuffle } from '../random.js';
import { rawFile, resultsDir, ROOT, scoredFile } from '../paths.js';

export const SEED = 20261107;
export const PER_GROUP = 4;
// K3: how many answers of each scoring method per model (PLAN.md phase 8.4).
export const K3_SPLIT = [['rules', 2], ['judge', 2]];
export const SAMPLE_HEADER = ['answerId', 'sourceText', 'task', 'answer'];
export const KEY_HEADER = ['answerId', 'key', 'scoringMethod'];

export const humanDir = () => path.join(resultsDir(), 'human');

// scoreRows: the score rows of the run; models: model ids in the config order.
// Returns [{ answerId, row }] in the shuffled order.
export function drawHumanSample({ scoreRows, models, seed = SEED }) {
  const random = mulberry32(seed);
  const picked = [];
  for (const category of [1, 2, 3]) {
    for (const model of models) {
      const rows = scoreRows.filter((r) => r.category === category && r.modelId === model);
      const parts = category === 3 ? K3_SPLIT : [[null, PER_GROUP]];
      for (const [method, n] of parts) {
        const pool = method ? rows.filter((r) => r.scoringMethod === method) : rows;
        const taskIds = shuffle([...new Set(pool.map((r) => r.taskId))].sort(), random).slice(0, n);
        if (taskIds.length < n) throw new Error(`K${category} ${model}${method ? ` ${method}` : ''}: only ${taskIds.length} tasks, ${n} needed`);
        for (const taskId of taskIds) {
          const repeats = pool.filter((r) => r.taskId === taskId).sort((a, b) => a.repeat - b.repeat);
          picked.push(repeats[Math.floor(random() * repeats.length)]);
        }
      }
    }
  }
  return shuffle(picked, random).map((row, i) => ({ answerId: `A${String(i + 1).padStart(2, '0')}`, row }));
}

// The task as the model saw it, without the source text: the user message after "Tekst:\n{input}\n\n"
// (for K2 this keeps the schema, which is part of the task).
export function taskText(task, bank) {
  const message = buildUserMessage(task, bank);
  const prefix = `Tekst:\n${task.input}\n\n`;
  if (!message.startsWith(prefix)) throw new Error(`${task.id}: the user message does not start with the source text`);
  return message.slice(prefix.length);
}

// sample: from drawHumanSample; rawByKey: raw row key → raw row. Returns the two CSV texts.
export function sampleFiles({ sample, rawByKey, bank }) {
  const tasks = new Map(bank.tasks.map((t) => [t.id, t]));
  let sampleCsv = csvLine(SAMPLE_HEADER);
  let keyCsv = csvLine(KEY_HEADER);
  for (const { answerId, row } of sample) {
    const raw = rawByKey.get(row.key);
    if (!raw || raw.status !== 'ok') throw new Error(`${row.key}: no ok raw row`);
    const task = tasks.get(row.taskId);
    sampleCsv += csvLine([answerId, task.input, taskText(task, bank), raw.text]);
    keyCsv += csvLine([answerId, row.key, row.scoringMethod]);
  }
  return { sampleCsv, keyCsv };
}

// Flag wx: an existing sample is never overwritten (the raters score exactly this sample).
export function writeSampleFiles({ dir, sampleCsv, keyCsv }) {
  const files = { sample: path.join(dir, 'sample.csv'), key: path.join(dir, 'key.csv') };
  for (const f of Object.values(files)) if (fs.existsSync(f)) throw new Error(`${f} already exists: the sample is fixed`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(files.sample, sampleCsv, { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(files.key, keyCsv, { encoding: 'utf8', flag: 'wx' });
  return files;
}

function main() {
  const { values } = parseArgs({ args: process.argv.slice(2), options: { run: { type: 'string', default: 'main' } } });
  const runId = values.run;
  const run = JSON.parse(fs.readFileSync(new URL(`config/run.${runId}.json`, ROOT), 'utf8'));
  const scoreRows = fs.readFileSync(scoredFile(runId), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const rawByKey = new Map(readRawRows(rawFile(runId)).map((r) => [r.key, r]));
  const bank = loadTaskBank();
  const sample = drawHumanSample({ scoreRows, models: run.models });
  const files = writeSampleFiles({ dir: humanDir(), ...sampleFiles({ sample, rawByKey, bank }) });
  console.log(`${sample.length} answers (seed ${SEED}) → ${files.sample} (key: ${files.key})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) main();
