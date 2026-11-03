// Data for the pilot run report (PLAN.md phase 5): errors and truncated answers per model, actual
// cost and time with the estimate for the main run, suspicious tasks, judge status.
//
//   node src/report/pilot.js --run pilot
//     reads results/raw, results/scored, results/cost and results/judge
//     writes results/pilot/report_data.md
//
// Only counts and lists; the conclusions are written by hand into the report.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadTaskBank } from '../taskBank.js';
import { readRawRows } from '../runner/rawRows.js';
import { costFile, judgeDir, rawFile, resultsDir, scoredFile } from '../paths.js';
import { readKey, readScores } from '../judge/common.js';
import { normalize } from '../checkers/normalize.js';

const TRUNCATED = new Set(['length', 'max_tokens', 'MAX_TOKENS']);
const MAIN_REPEATS = 5;

const readJsonl = (file) => (fs.existsSync(file)
  ? fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  : []);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const f = (x, digits = 3) => (x === null || x === undefined ? '-' : x.toFixed(digits));
const usd = (x) => (x === null ? '-' : `$${x.toFixed(4)}`);
const short = (s, n = 70) => JSON.stringify(s.length > n ? `${s.slice(0, n)}…` : s).replace(/\|/g, '\\|');
const minutes = (ms) => `${(ms / 60000).toFixed(1)} min`;

export function buildReportData({ runId, raw, scored, cost, judgeKey, judgeScores, bank }) {
  const tasks = new Map(bank.tasks.map((t) => [t.id, t]));
  const scoreByKey = new Map(scored.map((s) => [s.key, s]));
  const costByKey = new Map(cost.map((c) => [c.key, c]));
  const models = [...new Set(raw.map((r) => r.modelId))];
  const out = [`# Pilot run data: ${runId}`, '', `Generated from the stored rows (${raw.length} raw rows).`, ''];

  // --- Per model ---
  out.push('## Per model', '',
    '| model | answers | errors | retries | truncated | empty | format | correctness | costBilled | costCriterion/request | median total | median TTFT | mean output tokens | mean reasoning |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of models) {
    const rows = raw.filter((r) => r.modelId === m);
    const ok = rows.filter((r) => r.status === 'ok');
    const sc = ok.map((r) => scoreByKey.get(r.key)).filter(Boolean);
    const co = ok.map((r) => costByKey.get(r.key)).filter((c) => c && c.costBilled !== null);
    const correctness = sc.filter((s) => s.correctness !== null).map((s) => s.correctness);
    out.push(`| ${m} | ${ok.length} | ${rows.length - ok.length} | ${sum(rows.map((r) => r.retries?.length ?? 0))} | ` +
      `${ok.filter((r) => TRUNCATED.has(r.finishReason)).length} | ${ok.filter((r) => r.text.trim() === '').length} | ` +
      `${f(mean(sc.map((s) => s.format)))} | ${f(mean(correctness))} | ${usd(sum(co.map((c) => c.costBilled)))} | ` +
      `${co.length ? `$${(sum(co.map((c) => c.costCriterion)) / co.length).toFixed(6)}` : '-'} | ` +
      `${f(median(ok.map((r) => r.totalMs)) / 1000, 1)} s | ${f((median(ok.filter((r) => r.ttftMs !== null).map((r) => r.ttftMs)) ?? 0) / 1000, 1)} s | ` +
      `${f(mean(ok.map((r) => r.usage?.output ?? 0)), 0)} | ${f(mean(ok.map((r) => r.usage?.reasoning ?? 0)), 0)} |`);
  }

  // --- Errors and truncated answers ---
  const errors = raw.filter((r) => r.status === 'error');
  const truncated = raw.filter((r) => r.status === 'ok' && TRUNCATED.has(r.finishReason));
  out.push('', '## Errors and truncated answers', '');
  if (!errors.length && !truncated.length) out.push('None.');
  for (const r of errors) out.push(`- ERROR ${r.key}: ${r.error.httpStatus ?? '-'} ${r.error.message}`);
  for (const r of truncated) out.push(`- TRUNCATED ${r.key}: finishReason ${r.finishReason}, output ${r.usage?.output} tokens`);

  // --- Time and cost, estimate for the main run ---
  const ok = raw.filter((r) => r.status === 'ok');
  const starts = raw.map((r) => Date.parse(r.tsStartUtc));
  const last = raw.reduce((a, r) => (Date.parse(r.tsStartUtc) > Date.parse(a.tsStartUtc) ? r : a), raw[0]);
  const wallMs = Date.parse(last.tsStartUtc) + (last.totalMs ?? 0) - Math.min(...starts);
  const requestMs = sum(ok.map((r) => r.totalMs));
  const billed = sum(cost.filter((c) => c.costBilled !== null).map((c) => c.costBilled));
  out.push('', '## Time and cost', '',
    `- Wall-clock time from the first request to the end of the last: ${minutes(wallMs)} (includes pauses between runs).`,
    `- Sum of request times: ${minutes(requestMs)}.`,
    `- costBilled in total: ${usd(billed)}; costCriterion in total: ${usd(sum(cost.filter((c) => c.costCriterion !== null).map((c) => c.costCriterion)))}.`,
    `- Estimate for the main run (×${MAIN_REPEATS}): about ${usd(billed * MAIN_REPEATS)} and ${minutes(requestMs * MAIN_REPEATS)} of request time.`,
    '', '| model | costBilled pilot | estimate main run |', '|---|---|---|');
  for (const m of models) {
    const b = sum(ok.filter((r) => r.modelId === m).map((r) => costByKey.get(r.key)?.costBilled ?? 0));
    out.push(`| ${m} | ${usd(b)} | ${usd(b * MAIN_REPEATS)} |`);
  }

  // --- Suspicious tasks ---
  const byTask = new Map();
  for (const s of scored) {
    if (!byTask.has(s.taskId)) byTask.set(s.taskId, []);
    byTask.get(s.taskId).push(s);
  }
  const answerOf = (key) => raw.find((r) => r.key === key)?.text ?? '';
  const listTask = (id, ss) => {
    out.push(`- **${id}** (${tasks.get(id).instruction.slice(0, 80)})`);
    for (const s of ss) out.push(`  - ${s.modelId}: format ${s.format}, correctness ${f(s.correctness, 2)}, answer ${short(answerOf(s.key))}`);
  };
  out.push('', '## Suspicious tasks', '', '### All models correctness 0 (rule-scored)', '');
  const allWrong = [...byTask].filter(([, ss]) => ss.length > 1 && ss.every((s) => s.scoringMethod === 'rules' && s.correctness === 0));
  if (!allWrong.length) out.push('None.');
  for (const [id, ss] of allWrong) listTask(id, ss);

  out.push('', '### All models format 0', '');
  const allFormat0 = [...byTask].filter(([, ss]) => ss.length > 1 && ss.every((s) => s.format === 0));
  if (!allFormat0.length) out.push('None.');
  for (const [id, ss] of allFormat0) listTask(id, ss);

  out.push('', '### Mean correctness below 0.5 across the models (rule-scored, not listed above)', '');
  const low = [...byTask].filter(([id, ss]) => !allWrong.some(([w]) => w === id)
    && ss.every((s) => s.scoringMethod === 'rules') && mean(ss.map((s) => s.correctness)) < 0.5);
  if (!low.length) out.push('None.');
  for (const [id, ss] of low) listTask(id, ss);

  // K1 answers that are wrong only because of Markdown emphasis or code marks.
  out.push('', '### K1: correct after removing Markdown marks (*, _, `), but scored 0', '');
  const markdown = scored.filter((s) => s.category === 1 && s.correctness === 0).filter((s) => {
    const t = tasks.get(s.taskId);
    const stripped = answerOf(s.key).replace(/[*_`]/g, '');
    return t.check.allowed.includes(normalize(stripped, t.check.normalize));
  });
  if (!markdown.length) out.push('None.');
  for (const s of markdown) out.push(`- ${s.key}: ${short(answerOf(s.key))}`);

  // K2 answers with code fences or text around the JSON.
  out.push('', '### K2: format 0', '');
  const k2 = scored.filter((s) => s.category === 2 && s.format === 0);
  if (!k2.length) out.push('None.');
  for (const s of k2) out.push(`- ${s.key}: correctness ${f(s.correctness, 2)}, starts ${short(answerOf(s.key), 40)}`);

  // --- Judge ---
  out.push('', '## Judge', '');
  const runKeys = new Set(raw.map((r) => r.key));
  const ids = new Set(judgeKey.filter((k) => runKeys.has(k.key)).map((k) => k.id));
  const js = judgeScores.filter((s) => ids.has(s.id));
  const byId = new Map();
  for (const s of js) {
    if (!byId.has(s.id)) byId.set(s.id, []);
    byId.get(s.id).push(s);
  }
  const complete = [...byId.values()].filter((ss) => ss.length === 3);
  out.push(`- Files: ${ids.size}; scores: ${js.length}; missing (null): ${js.filter((s) => s.score === null).length}; ` +
    `invalid attempts: ${sum(js.map((s) => s.invalidAttempts?.length ?? 0))}.`,
  `- Models in the answers: ${[...new Set(js.map((s) => s.model))].join(', ') || '-'}; Claude Code: ${[...new Set(js.map((s) => s.claudeCodeVersion))].join(', ') || '-'}.`,
  `- Files whose 3 scores are not all the same: ${complete.filter((ss) => new Set(ss.map((s) => s.score)).size > 1).length} of ${complete.length}.`,
  `- Score distribution: ${[0, 1, 2].map((v) => `${v}: ${js.filter((s) => s.score === v).length}`).join(', ')}.`);
  return out.join('\n') + '\n';
}

function main() {
  const { values } = parseArgs({ args: process.argv.slice(2), options: { run: { type: 'string' } } });
  if (!values.run || !/^[\w.-]+$/.test(values.run)) {
    console.error('Usage: node src/report/pilot.js --run <runId>');
    process.exit(2);
  }
  const runId = values.run;
  const text = buildReportData({
    runId,
    raw: readRawRows(rawFile(runId)),
    scored: readJsonl(scoredFile(runId)),
    cost: readJsonl(costFile(runId)),
    judgeKey: readKey(judgeDir()),
    judgeScores: readScores(judgeDir()),
    bank: loadTaskBank(),
  });
  const file = path.join(resultsDir(), runId, 'report_data.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  console.log(`Report data → ${file}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
