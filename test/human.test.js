// The human evaluation sample and the import of the raters' answers (PLAN.md phase 8.4, [M14]).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadTaskBank } from '../src/taskBank.js';
import { parseCsv, parseCsvObjects } from '../src/csv.js';
import { drawHumanSample, KEY_HEADER, SAMPLE_HEADER, sampleFiles, taskText, writeSampleFiles } from '../src/human/sample.js';
import { convertResponses, parseScore, writeScoreFiles } from '../src/human/import.js';

const bank = loadTaskBank();
const models = ['openai', 'anthropic', 'google', 'deepseek', 'xai'];
const judgeTasks = new Set(bank.judge_instructions.tasks);

// Score rows of a full main run: every model × task × 5 repeats.
const scoreRows = models.flatMap((modelId) => bank.tasks.flatMap((t) => [1, 2, 3, 4, 5].map((repeat) => ({
  key: `main|${t.id}|${modelId}|${repeat}`, taskId: t.id, modelId, repeat, category: t.category,
  scoringMethod: judgeTasks.has(t.id) ? 'judge' : 'rules',
}))));
const rawByKey = new Map(scoreRows.map((r) => [r.key, { key: r.key, status: 'ok', text: `vastus ${r.key}` }]));
const modelOf = (row) => row.key.split('|')[2];

test('sample: 60 answers, 4 per category and model, in K3 2 rule-scored and 2 judge-scored', () => {
  const sample = drawHumanSample({ scoreRows, models });
  assert.equal(sample.length, 60);
  assert.deepEqual(sample.map((s) => s.answerId), Array.from({ length: 60 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`));
  for (const category of [1, 2, 3]) {
    for (const m of models) {
      const group = sample.filter((s) => s.row.category === category && modelOf(s.row) === m);
      assert.equal(group.length, 4, `K${category} ${m}`);
      assert.equal(new Set(group.map((s) => s.row.taskId)).size, 4, `K${category} ${m}: different tasks`);
      if (category === 3) {
        assert.equal(group.filter((s) => s.row.scoringMethod === 'judge').length, 2);
        assert.equal(group.filter((s) => s.row.scoringMethod === 'rules').length, 2);
      }
    }
  }
});

test('sample: the same seed gives the same sample, another seed another one; the order is shuffled', () => {
  const a = drawHumanSample({ scoreRows, models }).map((s) => s.row.key);
  assert.deepEqual(drawHumanSample({ scoreRows, models }).map((s) => s.row.key), a);
  assert.notDeepEqual(drawHumanSample({ scoreRows, models, seed: 1 }).map((s) => s.row.key), a);
  // not in category order: the first 20 are not all K1
  const first = drawHumanSample({ scoreRows, models }).slice(0, 20);
  assert.ok(new Set(first.map((s) => s.row.category)).size > 1);
});

test('sample: too few tasks is an error', () => {
  assert.throws(() => drawHumanSample({ scoreRows: scoreRows.filter((r) => r.taskId !== 'K3-026' && r.taskId !== 'K3-027' && r.taskId !== 'K3-028' && r.taskId !== 'K3-031' && r.taskId !== 'K3-033' && r.taskId !== 'K3-035' && r.taskId !== 'K3-037'), models }), /judge: only 1 tasks/);
});

test('sample files: four columns without the model name; the task as the model saw it; the key separately', () => {
  const sample = drawHumanSample({ scoreRows, models });
  const { sampleCsv, keyCsv } = sampleFiles({ sample, rawByKey, bank });
  const rows = parseCsv(sampleCsv);
  assert.deepEqual(rows[0], SAMPLE_HEADER);
  assert.equal(rows.length, 61);
  const key = parseCsvObjects(keyCsv);
  assert.deepEqual(Object.keys(key[0]), KEY_HEADER);
  for (const [i, r] of rows.slice(1).entries()) {
    const { row } = sample[i];
    const task = bank.tasks.find((t) => t.id === row.taskId);
    assert.equal(r[0], key[i].answerId);
    assert.equal(r[1], task.input);
    assert.equal(r[3], `vastus ${row.key}`);
    assert.equal(key[i].key, row.key);
    assert.equal(key[i].scoringMethod, row.scoringMethod);
  }
  const k2 = bank.tasks.find((t) => t.id === 'K2-040');
  assert.match(taskText(k2, bank), /^Skeem:\n\{\n {2}"kohtumised"/);
  assert.ok(taskText(k2, bank).endsWith(k2.instruction));
  const k1 = bank.tasks.find((t) => t.id === 'K1-002');
  assert.equal(taskText(k1, bank), k1.instruction);
});

test('sample files: an existing sample is never overwritten', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'human-'));
  writeSampleFiles({ dir, sampleCsv: 'a\n', keyCsv: 'b\n' });
  assert.throws(() => writeSampleFiles({ dir, sampleCsv: 'c\n', keyCsv: 'd\n' }), /already exists/);
  assert.equal(fs.readFileSync(path.join(dir, 'sample.csv'), 'utf8'), 'a\n');
});

const responses = [
  '"Ajatempel","Hindaja","A02","A02 kommentaar","A01","A01 kommentaar"',
  '"2026/11/24 10:00:00","2","1 – osaliselt õige","","2 – õige",""',
  '"2026/11/24 11:00:00","1","0 – vale","puudu, ""vale"" kuupäev","2 – õige",""',
].join('\n') + '\n';

test('import: one file per rater, sorted by answerId, score from the choice text, comment kept', () => {
  const out = convertResponses(responses, ['A01', 'A02']);
  assert.equal(out['1'], 'answerId,score,comment\nA01,2,\nA02,0,"puudu, ""vale"" kuupäev"\n');
  assert.equal(out['2'], 'answerId,score,comment\nA01,2,\nA02,1,\n');
  assert.deepEqual(convertResponses(`﻿${responses}`, ['A01', 'A02']), out);
});

test('import: two responses of one rater, a missing rater, a missing column or a bad score are errors', () => {
  const lines = responses.trim().split('\n');
  assert.throws(() => convertResponses([...lines, lines[2]].join('\n'), ['A01', 'A02']), /more than one response from rater 1/);
  assert.throws(() => convertResponses(lines.slice(0, 2).join('\n'), ['A01', 'A02']), /no response from rater 1/);
  assert.throws(() => convertResponses(responses, ['A01', 'A02', 'A03']), /no column "A03"/);
  assert.equal(parseScore('2 – õige', 'x'), 2);
  assert.equal(parseScore('0', 'x'), 0);
  assert.throws(() => parseScore('3 – väga hea', 'x'), /not a score/);
  assert.throws(() => parseScore('', 'x'), /not a score/);
  assert.throws(() => parseScore('12', 'x'), /not a score/);
});

test('import: rater scores are never overwritten', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'human-'));
  const files = convertResponses(responses, ['A01', 'A02']);
  writeScoreFiles(dir, files);
  assert.throws(() => writeScoreFiles(dir, files), /never overwritten/);
});
