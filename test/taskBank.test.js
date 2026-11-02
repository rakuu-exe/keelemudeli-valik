// Check script for task bank v1.3 (PLAN.md phase 0). Run: npm run check
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { loadTaskBank, buildUserMessage } from '../src/taskBank.js';
import { buildRegex } from '../src/checkers/regex.js';
import { checkRules } from '../src/checkers/rules.js';
import { normalize } from '../src/checkers/normalize.js';

const bank = loadTaskBank();
const tasks = bank.tasks;
const inCategory = (c) => tasks.filter((t) => t.category === c);
const find = (id) => tasks.find((t) => t.id === id);
const dataDir = new URL('../data/', import.meta.url);
const samples = JSON.parse(fs.readFileSync(new URL('./fixtures/k3_sample_answers.json', import.meta.url), 'utf8')).answers;

const JUDGE_TASKS = ['K3-026', 'K3-027', 'K3-028', 'K3-031', 'K3-033', 'K3-035', 'K3-037', 'K3-039'];
const allRules = (t) => [...(t.check.rules ?? []), ...(t.check.extra_rules ?? [])];
const regexRules = tasks.flatMap((t) => allRules(t).filter((r) => r.rule.startsWith('regex_')).map((r) => ({ id: t.id, r })));

describe('Structure', () => {
  test('version 1.3 and 120 unique tasks', () => {
    assert.equal(bank.version, '1.3');
    assert.equal(tasks.length, 120);
    assert.equal(new Set(tasks.map((t) => t.id)).size, 120);
  });

  for (const c of [1, 2, 3]) {
    test(`K${c}: 40 tasks, difficulty levels 10/15/15`, () => {
      const t = inCategory(c);
      assert.equal(t.length, 40);
      assert.deepEqual([1, 3, 5].map((d) => t.filter((x) => x.difficulty === d).length), [10, 15, 15]);
    });
  }

  test('the judge tasks are exactly these 8', () => {
    assert.deepEqual(tasks.filter((t) => t.check.type === 'judge').map((t) => t.id), JUDGE_TASKS);
    assert.deepEqual(bank.judge_instructions.tasks, JUDGE_TASKS);
  });
});

describe('v1.3 changes', () => {
  test('no system prompt and no thinking mode note', () => {
    assert.deepEqual(Object.keys(bank.measurement), ['repeats', 'also_measure', 'request', 'settings']);
  });

  test('franc: Estonian = ekk, choice between Estonian and English', () => {
    assert.deepEqual(bank.language_check.franc_codes, { et: 'ekk', en: 'eng' });
    assert.deepEqual(bank.language_check.franc_candidates, ['ekk', 'eng']);
  });

  test("no Python (?i) flag remains and all 16 regexes compile in Node", () => {
    assert.equal(regexRules.length, 16);
    for (const { id, r } of regexRules) {
      assert.ok(!r.value.includes('(?i)'), `${id}: (?i) remains`);
      assert.doesNotThrow(() => buildRegex(r), `${id}: ${r.value}`);
    }
  });

  test('the former 9 (?i) regexes and K3-005 are case-insensitive', () => {
    const insensitive = regexRules.filter(({ r }) => (r.flags ?? '').includes('i')).map(({ id }) => id);
    assert.deepEqual(insensitive, ['K3-005', 'K3-014', 'K3-019', 'K3-021', 'K3-024', 'K3-030', 'K3-032',
      'K3-038', 'K3-040', 'K3-040']);
  });

  test('K3-005 finds the number of participants also at the start of a sentence', () => {
    const r = buildRegex(allRules(find('K3-005')).find((x) => x.rule === 'regex_present'));
    for (const s of ['Üheksast kliendist viis oli rahul.', 'Küsitluses osales üheksa klienti.', 'Osales 9 klienti.']) {
      assert.ok(r.test(s), s);
    }
  });

  test('the K3-032 source text has no verb "viis läbi"', () => {
    assert.ok(!/viis läbi|viidi läbi/.test(find('K3-032').input));
  });
});

describe('Word boundaries (K3-032 and K3-030)', () => {
  const pattern = (id) => buildRegex(allRules(find(id)).find((r) => r.rule === 'regex_absent'));
  const cases = {
    'K3-032': {
      matches: ['Üks klient jättis vastamata.', 'viie kliendi hinnang', 'üheksast osalejast',
        'kolmandik vastanutest', 'Osales 9 klienti.', 'kahe kliendi arvates'],
      noMatch: ['Ettevõte viis läbi kliendiküsitluse.', 'ükski ei keeldunud', 'üksikasjalik küsitlus',
        'kolmapäeval saadeti', 'enamik oli rahul'],
    },
    'K3-030': {
      matches: ['Tegevjuhi sõnul kasv jätkub.', 'CEO sõnul', 'CEO-d usuvad', 'direktori hinnangul',
        'juhi sõnul', 'juhatuse esimees märkis'],
      noMatch: ['Kasvu juhtisid tellimusteenused.', 'kasv oli juhitud tellimustest',
        'Juhtkonna hinnangul jätkub', 'ettevõte juhib turgu'],
    },
  };
  for (const [id, { matches, noMatch }] of Object.entries(cases)) {
    for (const s of matches) test(`${id} matches: "${s}"`, () => assert.ok(pattern(id).test(s)));
    for (const s of noMatch) test(`${id} does not match: "${s}"`, () => assert.ok(!pattern(id).test(s)));
  }
});

describe('User message template', () => {
  test('the K1-001 message follows the template exactly', () => {
    const t = find('K1-001');
    assert.equal(buildUserMessage(t, bank), `Tekst:\n${t.input}\n\n${t.instruction}`);
  });

  test('the K2-001 message contains the schema as JSON', () => {
    const t = find('K2-001');
    assert.equal(buildUserMessage(t, bank), `Tekst:\n${t.input}\n\nSkeem:\n${JSON.stringify(t.schema, null, 2)}\n\n${t.instruction}`);
  });

  test('the message of all 120 tasks builds and no placeholders remain', () => {
    for (const t of tasks) {
      const s = buildUserMessage(t, bank);
      assert.ok(!/\{(input|instruction|schema)\}/.test(s), t.id);
      assert.ok(s.includes(t.input) && s.endsWith(t.instruction), t.id);
    }
  });
});

describe('K1: allowed answers are reachable after normalization', () => {
  for (const t of inCategory(1)) {
    test(t.id, () => {
      const { allowed, normalize: steps } = t.check;
      for (const a of allowed) {
        assert.ok(allowed.includes(normalize(a, steps)), `"${a}" does not normalize to itself`);
        // A typical correct answer: capital first letter and final period (if those steps are listed)
        let decorated = a;
        if (steps.includes('lowercase')) decorated = decorated[0].toUpperCase() + decorated.slice(1);
        if (steps.includes('strip_final_punctuation')) decorated += '.';
        if (steps.includes('strip_preamble')) decorated = 'Vastus: ' + decorated;
        assert.ok(allowed.includes(normalize(` ${decorated} `, steps)), `"${decorated}"`);
      }
    });
  }
});

describe('K2: references and JSON schemas', () => {
  const register = JSON.parse(fs.readFileSync(new URL(bank.json_schema_register, dataDir), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validators = new Map();
  const load = (id) => {
    if (!validators.has(id)) {
      const schema = JSON.parse(fs.readFileSync(new URL(register.schemas[id], dataDir), 'utf8'));
      validators.set(id, { schema, validate: ajv.compile(schema) });
    }
    return validators.get(id);
  };

  for (const t of inCategory(2)) {
    test(t.id, () => {
      assert.equal(register.schemas[t.id], t.json_schema, 'register and task point to the same file');
      const { schema, validate } = load(t.id);
      const expected = structuredClone(t.check.reference);
      for (const f of t.check.expected_null ?? []) expected[f] = null;

      // the fields are the same everywhere: task schema, JSON schema, reference
      const fields = (o) => Object.keys(o).sort();
      assert.deepEqual(fields(expected), fields(schema.properties), 'reference vs JSON schema');
      assert.deepEqual(fields(t.schema), fields(schema.properties), 'task schema vs JSON schema');

      assert.ok(validate(expected), `reference fails the schema: ${JSON.stringify(validate.errors)}`);
      const [first] = Object.keys(schema.properties);
      const missing = structuredClone(expected); delete missing[first];
      assert.ok(!validate(missing), `missing field "${first}" passed`);
      assert.ok(!validate({ ...expected, extra_field: 'x' }), 'extra field passed');
      for (const [k, s] of Object.entries(schema.properties)) {
        if (s.pattern?.includes('\\d{4}')) assert.ok(!validate({ ...expected, [k]: '03.04.2024' }), `date "${k}" in the wrong form passed`);
      }
    });
  }

  test('a disallowed enum value fails (K2-039, K2-035)', () => {
    assert.ok(!load('K2-039').validate({ staatus: 'OOTEL' }));
    assert.ok(!load('K2-035').validate({ ...find('K2-035').check.reference, 'tüüp': 'ARVE_KREEDIT' }));
  });
});

describe('K3: the sample answer passes its rules (judge tasks: extra_rules)', () => {
  test('every K3 task has a sample answer', () => {
    assert.deepEqual(Object.keys(samples).sort(), inCategory(3).map((t) => t.id).sort());
  });
  for (const t of inCategory(3)) {
    test(t.id, () => {
      const rules = t.check.type === 'judge' ? t.check.extra_rules : t.check.rules;
      const failed = checkRules(rules, samples[t.id], bank).filter((x) => !x.passed);
      assert.deepEqual(failed.map((x) => `${x.rule.rule}=${JSON.stringify(x.rule.value)}`), []);
    });
  }
});
