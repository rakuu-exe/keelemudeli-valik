// Tests of the rule-based scoring (PLAN.md phase 3). Every reference must get the maximum score,
// and each comparison rule of [M2, M3] has its own case.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadTaskBank } from '../src/taskBank.js';
import { buildRawRow } from '../src/runner/rawRows.js';
import { ApiError } from '../src/adapters/index.js';
import { createScorer, scoreRawRows } from '../src/checkers/score.js';
import { expectedAnswer, sameValue } from '../src/checkers/k2.js';
import { drawSample, renderManualCheck } from '../src/checkers/sample.js';

const bank = loadTaskBank();
const score = createScorer(bank);
const task = (id) => bank.tasks.find((t) => t.id === id);
const inCategory = (c) => bank.tasks.filter((t) => t.category === c);
const samples = JSON.parse(fs.readFileSync(new URL('./fixtures/k3_sample_answers.json', import.meta.url), 'utf8')).answers;
const JUDGE_TASKS = ['K3-026', 'K3-027', 'K3-028', 'K3-031', 'K3-033', 'K3-035', 'K3-037', 'K3-039'];
const json = (o) => JSON.stringify(o);
const pick = (s) => [s.format, s.correctness];

describe('every reference gets the maximum score', () => {
  for (const t of inCategory(1)) {
    test(`${t.id}: every allowed answer → format 1, correctness 1`, () => {
      for (const a of t.check.allowed) assert.deepEqual(pick(score(t.id, a)), [1, 1], a);
    });
  }
  for (const t of inCategory(2)) {
    test(`${t.id}: the reference as JSON → format 1, correctness 1, no null violations`, () => {
      const s = score(t.id, json(expectedAnswer(t)));
      assert.deepEqual(pick(s), [1, 1]);
      assert.equal(s.nullViolations, 0);
    });
  }
  for (const t of inCategory(3)) {
    test(`${t.id}: the sample answer → format 1${t.check.type === 'judge' ? ' (correctness from the judge)' : ', correctness 1'}`, () => {
      const s = score(t.id, samples[t.id]);
      assert.deepEqual(pick(s), [1, t.check.type === 'judge' ? null : 1]);
    });
  }
});

describe('K1: format = one of the allowed answers; correctness after normalization', () => {
  const cases = [
    // [task, answer, format, correctness]
    ['K1-001', 'Tallinn', 1, 1],
    ['K1-001', 'TALLINNAS', 1, 1],
    ['K1-001', '  tallinn\n', 1, 1],
    ['K1-001', 'Tallinnas.', 1, 1], // one final period is ignored (author's decision 3.11.2026)
    ['K1-001', 'Tallinnas. \n', 1, 1],
    ['K1-001', 'Tallinnas?', 0, 1], // other final marks are not ignored in the format
    ['K1-001', 'Tallinnas!', 0, 1],
    ['K1-001', 'Tallinnas..', 0, 0],
    ['K1-001', 'Vastus: Tallinn', 0, 1], // preamble
    ['K1-005', '15.30.', 1, 1],
    ['K1-001', 'Tartu', 0, 0],
    ['K1-001', 'Peakontor asub Tallinnas.', 0, 0],
    ['K1-001', '', 0, 0],
    ['K1-030', 'EI SELGU', 1, 1],
    ['K1-038', '2025-02-03', 1, 1],
    ['K1-038', '3.02.2025', 0, 1], // date_iso
    ['K1-038', '3. veebruar 2025', 0, 1],
    ['K1-025', '05:00', 1, 1],
  ];
  for (const [id, answer, format, correctness] of cases) {
    test(`${id} ${json(answer)} → format ${format}, correctness ${correctness}`, () => {
      const s = score(id, answer);
      assert.deepEqual(pick(s), [format, correctness]);
      assert.equal(s.scoringMethod, 'rules');
      assert.equal(s.nullViolations, null);
    });
  }
});

describe('K2: format and correctness are computed separately [M2b]', () => {
  const ref = { kontakt: 'Jaan Tamm', isikute_arv: 2, kellaaeg: '19.00' };

  test('code fence markers → format 0, correctness computed after removing them', () => {
    assert.deepEqual(pick(score('K2-001', '```json\n' + json(ref) + '\n```')), [0, 1]);
    assert.deepEqual(pick(score('K2-001', '```\n' + json(ref) + '\n```\n')), [0, 1]);
  });

  test('whitespace around the JSON is allowed by JSON itself → format 1', () => {
    assert.deepEqual(pick(score('K2-001', `\n  ${JSON.stringify(ref, null, 2)}\n`)), [1, 1]);
  });

  test('text around the JSON → it does not parse → format 0, correctness 0', () => {
    const s = score('K2-001', `Siin on JSON:\n${json(ref)}`);
    assert.deepEqual(pick(s), [0, 0]);
    assert.equal(s.nullViolations, null);
  });

  test('not an object (an array, a string) → format 0, correctness 0', () => {
    assert.deepEqual(pick(score('K2-001', json([ref]))), [0, 0]);
    assert.deepEqual(pick(score('K2-001', '"Jaan Tamm"')), [0, 0]);
  });

  test('missing field → format 0 (schema); that field is wrong', () => {
    const { kellaaeg, ...rest } = ref;
    assert.deepEqual(pick(score('K2-001', json(rest))), [0, 2 / 3]);
  });

  test('extra field → format 0 (schema); correctness counts only the reference fields', () => {
    assert.deepEqual(pick(score('K2-001', json({ ...ref, märkus: 'x' }))), [0, 1]);
  });

  test('wrong type (a number as a string) → format 0, and the field is wrong: numbers as numbers', () => {
    assert.deepEqual(pick(score('K2-001', json({ ...ref, isikute_arv: '2' }))), [0, 2 / 3]);
  });

  test('a disallowed enum value → format 0', () => {
    assert.equal(score('K2-039', json({ staatus: 'OOTEL' })).format, 0);
  });

  test('correctness = share of correct top-level fields', () => {
    assert.equal(score('K2-001', json({ ...ref, kontakt: 'Mari Maasikas' })).correctness, 2 / 3);
    assert.equal(score('K2-001', json({ kontakt: null, isikute_arv: null, kellaaeg: null })).correctness, 0);
  });
});

describe('K2: comparison of values [M2a]', () => {
  test('text: normalized whitespace and case-insensitive', () => {
    assert.ok(sameValue('Jaan Tamm', '  jaan   TAMM '));
    assert.ok(sameValue('Tartu mnt 12', 'Tartu\tmnt 12'));
    assert.ok(!sameValue('Jaan Tamm', 'JaanTamm'));
    assert.ok(!sameValue('Jaan Tamm', 'Jaan Tamme')); // the case form matters (nominative)
  });

  test('numbers as numbers', () => {
    assert.ok(sameValue(12.5, 12.50));
    assert.ok(sameValue(2, JSON.parse('2.0')));
    assert.ok(!sameValue(2, '2'));
    assert.ok(!sameValue(2, 3));
  });

  test('null must be null', () => {
    assert.ok(sameValue(null, null));
    assert.ok(!sameValue(null, ''));
    assert.ok(!sameValue(null, 'puudub'));
    assert.ok(!sameValue('x', null));
  });

  test('boolean', () => {
    assert.ok(sameValue(true, true));
    assert.ok(!sameValue(true, 'true'));
  });

  test('list: the same elements in any order; elements compared by the same rules', () => {
    assert.ok(sameValue(['Anu Lill', 'Peeter Kask', 'Mari Saar'], ['mari saar', 'Anu Lill', 'PEETER KASK']));
    assert.ok(!sameValue(['Anu Lill', 'Peeter Kask', 'Mari Saar'], ['Anu Lill', 'Peeter Kask']));
    assert.ok(!sameValue(['Anu Lill', 'Peeter Kask'], ['Anu Lill', 'Anu Lill']));
    assert.ok(!sameValue(['a'], 'a'));
  });

  test('list of objects (K2-028): order does not matter, every object must match', () => {
    const t = task('K2-028');
    const arved = [...t.check.reference.arved].reverse();
    assert.deepEqual(pick(score('K2-028', json({ arved }))), [1, 1]);
    const wrong = arved.map((a, i) => (i === 0 ? { ...a, summa: a.summa + 1 } : a));
    assert.deepEqual(pick(score('K2-028', json({ arved: wrong }))), [1, 0]);
  });

  test('object (K2-031): correct only when all its fields are correct; a top-level field counts once', () => {
    const ref = task('K2-031').check.reference;
    const s = score('K2-031', json({ ...ref, aadress: { ...ref.aadress, sihtnumber: '10146' } }));
    assert.deepEqual(pick(s), [1, 2 / 3]);
    assert.ok(!sameValue({ a: 1 }, { a: 1, b: 2 }));
  });
});

describe('K2: null violations (expected_null fields that got a value)', () => {
  test('K2-027: two expected_null fields; one gets a value → 1 violation, that field is wrong', () => {
    const expected = expectedAnswer(task('K2-027'));
    const s = score('K2-027', json({ ...expected, viitenumber: '12345' }));
    assert.equal(s.nullViolations, 1);
    assert.equal(s.correctness, 3 / 4);
    assert.equal(score('K2-027', json({ ...expected, viitenumber: '1', kuupäev: '2025-01-01' })).nullViolations, 2);
  });

  test('a missing expected_null field is wrong but not a violation (no value was made up)', () => {
    const { viitenumber, ...rest } = expectedAnswer(task('K2-027'));
    const s = score('K2-027', json(rest));
    assert.equal(s.nullViolations, 0);
    assert.equal(s.correctness, 3 / 4);
  });

  test('task without expected_null fields → 0; K1 and K3 → null', () => {
    assert.equal(score('K2-001', json({ kontakt: 'x', isikute_arv: 1, kellaaeg: 'y' })).nullViolations, 0);
    assert.equal(score('K1-001', 'Tallinn').nullViolations, null);
    assert.equal(score('K3-001', samples['K3-001']).nullViolations, null);
  });

  test('the compiled schemas are cached: scoring the same task many times does not fail', () => {
    for (let i = 0; i < 3; i++) assert.doesNotThrow(() => score('K2-031', '{}'));
  });
});

describe('K3: format = length and structure rules, correctness = share of content rules', () => {
  // K3-001: max_words 40 (format); contains ["127", "2,4"], language et (content).
  const good = samples['K3-001'];

  test('a length rule fails → format 0, correctness unchanged', () => {
    const long = `${good} ${'Lisaks oli konverentsil palju huvitavaid esinejaid. '.repeat(5)}`;
    assert.deepEqual(pick(score('K3-001', long)), [0, 1]);
  });

  test('a content rule fails → share of content rules passed', () => {
    const without = good.replace('2,4', 'kaks');
    assert.deepEqual(pick(score('K3-001', without)), [1, 1 / 2]);
  });

  test('wrong language → the language rule fails', () => {
    const english = 'The technology conference in Tallinn had 127 participants from 14 countries and a budget of 2,4 million euros.';
    assert.deepEqual(pick(score('K3-001', english)), [1, 1 / 2]);
  });

  test('empty or whitespace-only answer → format 0, correctness 0 (not an error)', () => {
    for (const empty of ['', '  \n\t ']) {
      assert.deepEqual(pick(score('K3-001', empty)), [0, 0]);
      assert.deepEqual(pick(score('K3-029', empty)), [0, 0]); // would be 1 and 1 by the rules alone
    }
  });

  test('every rule-scored K3 task has content rules', () => {
    for (const t of inCategory(3).filter((x) => x.check.type === 'rules')) assert.doesNotThrow(() => score(t.id, samples[t.id]));
  });
});

describe('K3 judge tasks: format from the length and structure rules of extra_rules only', () => {
  test('the 8 judge tasks are scored by the judge; correctness null here', () => {
    for (const id of JUDGE_TASKS) {
      const s = score(id, samples[id]);
      assert.equal(s.scoringMethod, 'judge');
      assert.equal(s.correctness, null);
    }
    assert.ok(inCategory(3).filter((t) => !JUDGE_TASKS.includes(t.id)).every((t) => score(t.id, samples[t.id]).scoringMethod === 'rules'));
  });

  test('the language rule of extra_rules does not count (K3-026 has no length rule → format 1)', () => {
    assert.equal(score('K3-026', 'The summary is in English.').format, 1);
    assert.equal(score('K3-027', 'This answer is written in English and is short.').format, 1);
  });

  test('a length rule fails → format 0 (K3-027: max_words 30)', () => {
    assert.equal(score('K3-027', 'sõna '.repeat(31)).format, 0);
  });

  test('empty answer → format 0, correctness still from the judge', () => {
    assert.deepEqual(pick(score('K3-026', ' ')), [0, null]);
  });
});

describe('score rows', () => {
  const model = { id: 'openai', model: 'gpt-6.1-terra' };
  const raw = (taskId, text, repeat = 1) => buildRawRow({
    runId: 'r', taskId, model, repeat, tsStartUtc: '2026-11-20T10:00:00.000Z',
    result: { text, modelVersion: 'v', finishReason: 'stop', usage: {}, usageRaw: {}, ttftMs: 1, totalMs: 2 },
  });

  test('fields as in CLAUDE.md (plus nullViolations); error rows are skipped', () => {
    const error = buildRawRow({
      runId: 'r', taskId: 'K1-002', model, repeat: 1, tsStartUtc: '2026-11-20T10:00:00.000Z',
      error: new ApiError('Overloaded', { status: 529, retryable: true }),
    });
    const { rows, skippedErrors } = scoreRawRows([raw('K1-001', 'Vastus: Tallinnas'), error, raw('K3-026', samples['K3-026'])], score);
    assert.equal(skippedErrors, 1);
    assert.deepEqual(rows, [
      { key: 'r|K1-001|openai|1', taskId: 'K1-001', modelId: 'openai', repeat: 1, category: 1, scoringMethod: 'rules', format: 0, correctness: 1, nullViolations: null },
      { key: 'r|K3-026|openai|1', taskId: 'K3-026', modelId: 'openai', repeat: 1, category: 3, scoringMethod: 'judge', format: 1, correctness: null, nullViolations: null },
    ]);
  });

  test('the raw row is not changed by scoring', () => {
    const row = raw('K2-001', '```json\n{}\n```');
    const before = JSON.stringify(row);
    scoreRawRows([row], score);
    assert.equal(JSON.stringify(row), before);
  });

  test('unknown status or task → error, not a silent skip', () => {
    assert.throws(() => scoreRawRows([{ ...raw('K1-001', 'x'), status: 'weird' }], score), /unknown status/);
    assert.throws(() => scoreRawRows([raw('K9-999', 'x')], score), /K9-999/);
  });
});

describe('manual check sample', () => {
  const items = Array.from({ length: 90 }, (_, i) => ({ id: i, category: (i % 3) + 1 }));

  test('the same seed gives the same sample; categories in turn (7/7/6 for 20)', () => {
    const a = drawSample(items, 20);
    assert.deepEqual(a, drawSample(items, 20));
    assert.deepEqual([1, 2, 3].map((c) => a.filter((x) => x.category === c).length), [7, 7, 6]);
    assert.equal(new Set(a.map((x) => x.id)).size, 20);
    assert.notDeepEqual(a.map((x) => x.id), drawSample(items, 20, 1).map((x) => x.id));
  });

  test('a small category is used up and the others fill the sample', () => {
    const few = [...items.filter((x) => x.category !== 2), { id: 'k2', category: 2 }];
    const s = drawSample(few, 20);
    assert.equal(s.length, 20);
    assert.equal(s.filter((x) => x.category === 2).length, 1);
    assert.equal(drawSample(items.slice(0, 5), 20).length, 5);
  });

  test('the check file shows the answer unchanged, the rules and the score', () => {
    const text = 'Vastus ~~~ sisaldab tildesid\nja | püstkriipsu';
    const r = { key: 'pilot|K3-001|google|1', finishReason: 'stop', text };
    const md = renderManualCheck('pilot', [{ raw: r, scored: score('K3-001', text) }], 1);
    assert.ok(md.includes(`~~~~text\n${text}\n~~~~`));
    assert.match(md, /\| max_words \| `40` \| format \| yes \|/);
    assert.match(md, /\*\*Score:\*\* format 1 · correctness 0\.500/);
  });
});
