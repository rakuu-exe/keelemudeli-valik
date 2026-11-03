// Shared judge code (PLAN.md phase 3b): the judge's input and answer schema, and reading a judge set
// (input/H####.json, key.csv, scores.jsonl).
import fs from 'node:fs';
import path from 'node:path';
import { parseCsvObjects } from '../csv.js';

export const JUDGE_MODEL = 'claude-opus-5-5';
export const REPEATS = 3;
export const VALID_SCORES = [0, 1, 2];

// The JSON schema given to the judge with --json-schema (keys in English: author's decision 3.11.2026).
export const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', enum: VALID_SCORES },
    justification: { type: 'string' },
  },
  required: ['score', 'justification'],
  additionalProperties: false,
};

// The judge's input: only the four fields of the anonymous file. The ID is not sent either; the model
// name and the raw row key are never in the file at all.
export const judgeInput = (file) => JSON.stringify({
  sourceText: file.sourceText,
  instruction: file.instruction,
  rubric: file.rubric,
  answer: file.answer,
}, null, 2);

export const inputDir = (dir) => path.join(dir, 'input');
export const keyFile = (dir) => path.join(dir, 'key.csv');
export const scoresFile = (dir) => path.join(dir, 'scores.jsonl');
export const ID_PATTERN = /^H\d{4}$/;

// key.csv: [{ id, key }], [] if the set does not exist yet.
export function readKey(dir) {
  const file = keyFile(dir);
  return fs.existsSync(file) ? parseCsvObjects(fs.readFileSync(file, 'utf8')) : [];
}

export function readScores(dir) {
  const file = scoresFile(dir);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l, i) => {
    try {
      return JSON.parse(l);
    } catch {
      throw new Error(`${file}: line ${i + 1} is not valid JSON`);
    }
  });
}

export function listInputIds(dir) {
  const d = inputDir(dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((id) => ID_PATTERN.test(id)).sort();
}

export const readInputFile = (dir, id) => JSON.parse(fs.readFileSync(path.join(inputDir(dir), `${id}.json`), 'utf8'));

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Raw row key → { correctness, validScores }. Correctness = median of the valid scores of the file,
// converted 0 → 0, 1 → 0.5, 2 → 1 (that is, median / 2). If a score is missing (3 invalid answers
// in a row), the median is taken of the valid ones; with none, correctness is null.
export function judgeCorrectnessByKey(dir) {
  const scoresById = new Map();
  for (const s of readScores(dir)) {
    if (!scoresById.has(s.id)) scoresById.set(s.id, []);
    if (s.score !== null) scoresById.get(s.id).push(s.score);
  }
  const byKey = new Map();
  for (const { id, key } of readKey(dir)) {
    const valid = scoresById.get(id) ?? [];
    const m = median(valid);
    byKey.set(key, { correctness: m === null ? null : m / 2, validScores: valid.length });
  }
  return byKey;
}
