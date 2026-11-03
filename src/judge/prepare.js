// Anonymous judge files (PLAN.md phase 3b, [M2d]).
//
//   node src/judge/prepare.js --run pilot [--dry-run]
//     every ok answer of the run to one of the 8 judge tasks → results/judge/input/H####.json,
//     and a row "H####,<raw row key>" in results/judge/key.csv
//   node src/judge/prepare.js --check
//     the judge check set results/judge-check/ (one file from the K3-026 sample answer)
//
// A file holds only the source text, the instruction, the rubric and the answer: no model name and
// no key. IDs are random and the files are written in a shuffled order (fixed seed, a different
// order for every run). Answers that already have a file are skipped, so running it again adds only
// new answers; existing files and key rows are never changed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadTaskBank } from '../taskBank.js';
import { readRawRows } from '../runner/rawRows.js';
import { csvLine } from '../csv.js';
import { mulberry32, seedFrom, shuffle } from '../random.js';
import { judgeCheckDir, judgeDir, rawFile, ROOT } from '../paths.js';
import { inputDir, keyFile, readKey } from './common.js';

export const SEED = 20261103;
const MAX_IDS = 9999;

// rawRows: raw rows of one run (error rows and other tasks are skipped). Returns the added [{ id, key }].
export function prepareJudgeFiles({ rawRows, bank, dir, seedText }) {
  const judgeTasks = new Set(bank.judge_instructions.tasks);
  const tasks = new Map(bank.tasks.map((t) => [t.id, t]));
  const existing = readKey(dir);
  const known = new Set(existing.map((r) => r.key));
  const usedIds = new Set(existing.map((r) => r.id));

  const fresh = rawRows.filter((r) => r.status === 'ok' && judgeTasks.has(r.taskId) && !known.has(r.key));
  if (usedIds.size + fresh.length > MAX_IDS) throw new Error('Not enough free judge IDs');
  const random = mulberry32(seedFrom(SEED, seedText));
  const added = [];
  fs.mkdirSync(inputDir(dir), { recursive: true });
  for (const raw of shuffle(fresh, random)) {
    const task = tasks.get(raw.taskId);
    if (task?.check.type !== 'judge') throw new Error(`${raw.taskId} is not a judge task`);
    let id;
    do id = `H${String(1 + Math.floor(random() * MAX_IDS)).padStart(4, '0')}`; while (usedIds.has(id));
    usedIds.add(id);
    const file = { id, sourceText: task.input, instruction: task.instruction, rubric: task.check.rubric, answer: raw.text };
    // flag wx: an existing file is never overwritten
    fs.writeFileSync(path.join(inputDir(dir), `${id}.json`), JSON.stringify(file, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    added.push({ id, key: raw.key });
  }
  if (added.length) {
    const file = keyFile(dir);
    const header = fs.existsSync(file) ? '' : csvLine(['id', 'key']);
    fs.appendFileSync(file, header + added.map((r) => csvLine([r.id, r.key])).join(''), 'utf8');
  }
  return added;
}

// The check set: the K3-026 sample answer (test/fixtures), written to score 2 on the rubric.
// Its key is not a raw row key, because it is not a model answer.
export function checkRows() {
  const fixture = new URL('test/fixtures/k3_sample_answers.json', ROOT);
  const samples = JSON.parse(fs.readFileSync(fixture, 'utf8')).answers;
  return [{ key: 'sample|K3-026', taskId: 'K3-026', status: 'ok', text: samples['K3-026'] }];
}

function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { run: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, check: { type: 'boolean', default: false } },
  });
  const bank = loadTaskBank();
  let rawRows;
  let dir;
  let seedText;
  if (values.check) {
    rawRows = checkRows();
    dir = judgeCheckDir();
    seedText = 'check';
  } else {
    if (!values.run || !/^[\w.-]+$/.test(values.run)) {
      console.error('Usage: node src/judge/prepare.js --run <runId> [--dry-run] | --check');
      process.exit(2);
    }
    const options = { dryRun: values['dry-run'] };
    const file = rawFile(values.run, options);
    if (!fs.existsSync(file)) throw new Error(`No raw rows: ${file}`);
    rawRows = readRawRows(file);
    dir = judgeDir(options);
    seedText = values.run;
  }
  const added = prepareJudgeFiles({ rawRows, bank, dir, seedText });
  console.log(`${added.length} new judge files → ${inputDir(dir)} (key: ${keyFile(dir)})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
