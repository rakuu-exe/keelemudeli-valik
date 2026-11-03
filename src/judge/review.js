// Judge scores for the author's review (PLAN.md phase 5: "the author reviews ~20 judge scores").
//
//   node src/judge/review.js --run pilot [--n 20]
//     writes results/<runId>/judge_check.md
//
// The files are drawn with a fixed seed from the judge files of the run. Like the judge, the review
// does not show the model name (only the file ID), so that the check is blind; key.csv tells the
// model afterwards if needed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { mulberry32, shuffle } from '../random.js';
import { judgeDir, resultsDir } from '../paths.js';
import { median, readInputFile, readKey, readScores } from './common.js';

export const SEED = 20261103;

const fenced = (text) => {
  const longest = Math.max(0, ...(text.match(/~+/g) ?? []).map((s) => s.length));
  const fence = '~'.repeat(Math.max(3, longest + 1));
  return `${fence}text\n${text}\n${fence}`;
};

export function renderJudgeCheck({ runId, dir, n }) {
  const runIds = readKey(dir).filter((k) => k.key.startsWith(`${runId}|`)).map((k) => k.id).sort();
  const scores = readScores(dir);
  const sample = shuffle(runIds, mulberry32(SEED)).slice(0, n);
  const out = [
    `# Review of judge scores: ${runId}`,
    '',
    `${sample.length} of ${runIds.length} judge files, drawn with seed ${SEED}. The model name is not shown.`,
    'For each one: read the rubric, the source text and the answer, write your own score (0, 1 or 2), and say whether the judge\'s scores are right.',
  ];
  sample.forEach((id, i) => {
    const file = readInputFile(dir, id);
    const own = scores.filter((s) => s.id === id).sort((a, b) => a.repeat - b.repeat);
    const valid = own.filter((s) => s.score !== null).map((s) => s.score);
    const m = median(valid);
    out.push(
      '', `## ${i + 1}. ${id}`, '',
      `**Instruction:** ${file.instruction}`, '',
      `**Rubric:** ${file.rubric}`, '',
      '**Source text:**', '', fenced(file.sourceText), '',
      '**Answer:**', '', fenced(file.answer), '',
      '**Judge:**', '',
      ...own.map((s) => `- repeat ${s.repeat}: score ${s.score ?? 'missing'} — ${s.justification ?? s.invalidAttempts.map((a) => a.reason).join('; ')}`),
      '', `Median ${m ?? '-'} → correctness ${m === null ? '-' : m / 2}`, '',
      '**Your score (0/1/2):** ', '',
      '**Check:** ',
    );
  });
  return out.join('\n') + '\n';
}

function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { run: { type: 'string' }, n: { type: 'string', default: '20' } },
  });
  if (!values.run || !/^[\w.-]+$/.test(values.run) || !/^[1-9]\d*$/.test(values.n)) {
    console.error('Usage: node src/judge/review.js --run <runId> [--n 20]');
    process.exit(2);
  }
  const file = path.join(resultsDir(), values.run, 'judge_check.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderJudgeCheck({ runId: values.run, dir: judgeDir(), n: Number(values.n) }), 'utf8');
  console.log(`Judge review → ${file}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
