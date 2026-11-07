// The raters' answers from the Google Form into the score files (PLAN.md phase 8.4, [M14]).
//
//   node src/human/import.js --file <responses.csv>
//     <responses.csv> = Google Forms → Responses → Download responses (.csv)
//     writes results/human/scores_rater1.csv and scores_rater2.csv (answerId, score, comment)
//
// The form (tools/apps_script/create_form.gs) has the question "Hindaja" (1 or 2), then for every
// answer the score question titled with its ID ("A17") and the comment question "A17 kommentaar".
// Exactly one response per rater is expected; a second one is an error, because it is not clear
// which one counts (the author decides). The score files are raw data: they are never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { csvLine, parseCsvObjects } from '../csv.js';
import { humanDir } from './sample.js';

export const RATER_COLUMN = 'Hindaja';
export const RATERS = ['1', '2'];
export const SCORE_HEADER = ['answerId', 'score', 'comment'];
export const commentColumn = (answerId) => `${answerId} kommentaar`;

// The choice text starts with the score: "2 – õige" → 2.
export function parseScore(value, where) {
  const m = String(value ?? '').trim().match(/^([012])(?!\d)/);
  if (!m) throw new Error(`${where}: not a score 0, 1 or 2: ${JSON.stringify(value)}`);
  return Number(m[1]);
}

// text: the responses CSV; answerIds: the IDs of the sample. Returns { '1': csvText, '2': csvText }.
export function convertResponses(text, answerIds) {
  const responses = parseCsvObjects(text.replace(/^﻿/, ''));
  const byRater = new Map();
  for (const r of responses) {
    const rater = String(r[RATER_COLUMN] ?? '').trim();
    if (!RATERS.includes(rater)) throw new Error(`a response with "${RATER_COLUMN}" = ${JSON.stringify(r[RATER_COLUMN])}`);
    if (byRater.has(rater)) throw new Error(`more than one response from rater ${rater}`);
    byRater.set(rater, r);
  }
  const out = {};
  for (const rater of RATERS) {
    const r = byRater.get(rater);
    if (!r) throw new Error(`no response from rater ${rater}`);
    let csv = csvLine(SCORE_HEADER);
    for (const id of [...answerIds].sort()) {
      if (!(id in r)) throw new Error(`no column "${id}" in the responses`);
      csv += csvLine([id, parseScore(r[id], `rater ${rater}, ${id}`), (r[commentColumn(id)] ?? '').trim()]);
    }
    out[rater] = csv;
  }
  return out;
}

export function writeScoreFiles(dir, files) {
  const paths = RATERS.map((rater) => path.join(dir, `scores_rater${rater}.csv`));
  for (const p of paths) if (fs.existsSync(p)) throw new Error(`${p} already exists: rater scores are never overwritten`);
  RATERS.forEach((rater, i) => fs.writeFileSync(paths[i], files[rater], { encoding: 'utf8', flag: 'wx' }));
  return paths;
}

function main() {
  const { values } = parseArgs({ args: process.argv.slice(2), options: { file: { type: 'string' } } });
  if (!values.file) throw new Error('Usage: node src/human/import.js --file <responses.csv>');
  const key = parseCsvObjects(fs.readFileSync(path.join(humanDir(), 'key.csv'), 'utf8'));
  const files = convertResponses(fs.readFileSync(values.file, 'utf8'), key.map((k) => k.answerId));
  const paths = writeScoreFiles(humanDir(), files);
  console.log(`${key.length} scores per rater → ${paths.join(', ')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) main();
