// Sample of rule scores for the author's manual check (PLAN.md phase 3: "the author has checked
// 20 random scores by hand"; done on the pilot run data, author's decision 3.11.2026).
//
//   node src/checkers/sample.js --run pilot [--n 20]
//     writes results/scored/<runId>.manual_check.md
//
// Only rule-scored rows (the judge scores are checked separately in phase 5). The rows are drawn
// with a fixed seed, in turn from each category, so that all three scoring methods are checked.
// The scores are computed again from the raw rows, with the same code as score.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTaskBank } from '../taskBank.js';
import { readRawRows } from '../runner/rawRows.js';
import { mulberry32, shuffle } from '../random.js';
import { manualCheckFile, rawFile } from '../paths.js';
import { createScorer, parseRunArgument } from './score.js';
import { expectedAnswer } from './k2.js';
import { FORMAT_RULES } from './k3.js';

export const SEED = 20261103;

// items: [{ category, ... }]. Shuffles each category, then takes one from each category in turn.
export function drawSample(items, n, seed = SEED) {
  const random = mulberry32(seed);
  const categories = [...new Set(items.map((x) => x.category))].sort();
  const queues = categories.map((c) => shuffle(items.filter((x) => x.category === c), random));
  const sample = [];
  while (sample.length < n && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && sample.length < n) sample.push(q.shift());
  }
  return sample;
}

const fenced = (text) => {
  const longest = Math.max(0, ...(text.match(/~+/g) ?? []).map((s) => s.length));
  const fence = '~'.repeat(Math.max(3, longest + 1));
  return `${fence}text\n${text}\n${fence}`;
};
// Inline code that keeps the value unchanged, also when it contains backticks.
const code = (v) => {
  const s = String(v);
  const longest = Math.max(0, ...(s.match(/`+/g) ?? []).map((x) => x.length));
  const ticks = '`'.repeat(longest + 1);
  return longest ? `${ticks} ${s} ${ticks}` : `\`${s}\``;
};
// In a table cell, | must be escaped (regexes often contain it).
const cell = (s) => s.replace(/\|/g, '\\|');
const number = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(3));

function describeCheck(task) {
  if (task.category === 1) {
    return [
      `**Allowed answers:** ${task.check.allowed.map(code).join(', ')}`,
      '',
      `**Normalization:** ${task.check.normalize.join(', ')}`,
    ];
  }
  if (task.category === 2) {
    return [
      `**Expected JSON** (expected_null: ${(task.check.expected_null ?? []).join(', ') || 'none'}):`,
      fenced(JSON.stringify(expectedAnswer(task), null, 2)),
    ];
  }
  return [];
}

function describeResult(s) {
  const lines = [`**Score:** format ${s.format} · correctness ${number(s.correctness)}`];
  if (s.task.category === 1) lines.push(`- answer after normalization: ${code(s.details.normalized)}`);
  if (s.task.category === 2) {
    if (!s.details.parsed) lines.push('- no JSON object could be read (correctness 0)');
    else {
      lines.push(`- wrong fields: ${s.details.wrongFields.length ? s.details.wrongFields.map(code).join(', ') : 'none'}`);
      lines.push(`- nullViolations: ${s.nullViolations}`);
    }
  }
  if (s.task.category === 3) {
    if (s.details.empty) lines.push('- empty answer → format 0, correctness 0');
    lines.push('', '| rule | value | counts for | passed |', '|---|---|---|---|');
    for (const { rule, passed } of s.details.rules) {
      const value = rule.rule.startsWith('regex_')
        ? `${rule.value} (flags: ${rule.flags ?? '-'}${rule.whole_word ? ', whole word' : ''})`
        : JSON.stringify(rule.value);
      lines.push(`| ${rule.rule} | ${cell(code(value))} | ${FORMAT_RULES.has(rule.rule) ? 'format' : 'correctness'} | ${passed ? 'yes' : '**no**'} |`);
    }
  }
  return lines;
}

export function renderManualCheck(runId, sample, total) {
  const perCategory = [1, 2, 3].map((c) => `${sample.filter((x) => x.scored.task.category === c).length} K${c}`).join(', ');
  const out = [
    `# Manual check of rule scores: ${runId}`,
    '',
    `${sample.length} score rows drawn with seed ${SEED} (${perCategory}) from ${total} rule-scored answers.`,
    'For each one: is the score right according to the task bank rules? Write "ok" or what is wrong after **Check:**.',
  ];
  sample.forEach(({ raw, scored }, i) => {
    const t = scored.task;
    out.push(
      '', `## ${i + 1}. ${t.id} (K${t.category}, difficulty ${t.difficulty})`, '',
      `Key: ${code(raw.key)}`, '',
      `**Instruction:** ${t.instruction}`, '',
      '<details><summary>Source text</summary>', '', fenced(t.input), '', '</details>', '',
      ...describeCheck(t), '',
      `**Answer** (exactly as returned; finishReason ${raw.finishReason}):`, '',
      fenced(raw.text), '',
      ...describeResult(scored), '',
      '**Check:** ',
    );
  });
  return out.join('\n') + '\n';
}

function main() {
  let args;
  try {
    args = parseRunArgument(process.argv.slice(2), { n: { type: 'string', default: '20' } });
    if (!/^[1-9]\d*$/.test(args.n)) throw new Error('--n must be a positive integer');
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  const bank = loadTaskBank();
  const scoreAnswer = createScorer(bank);
  const items = readRawRows(rawFile(args.run))
    .filter((raw) => raw.status === 'ok')
    .map((raw) => ({ raw, scored: scoreAnswer(raw.taskId, raw.text) }))
    .filter((x) => x.scored.scoringMethod === 'rules')
    .map((x) => ({ ...x, category: x.scored.task.category }));
  const sample = drawSample(items, Number(args.n));
  const file = manualCheckFile(args.run);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderManualCheck(args.run, sample, items.length), 'utf8');
  console.log(`${sample.length} scores for the manual check → ${file}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
