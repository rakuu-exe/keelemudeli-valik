// Category 2 (json_fields) [M2a, M2b, M3].
//   format      = the answer parses as JSON without changes and matches the task's JSON schema
//                 (code fence markers → format 0)
//   correctness = share of top-level reference fields that are correct, computed after removing
//                 code fence markers; if the JSON still does not parse (or is not an object) → 0
//   nullViolations = number of expected_null fields that got a value (the task bank's separate
//                 counter; author's decision 3.11.2026); null if no JSON object could be read
// Comparison: text with normalized whitespace and case-insensitively; numbers as numbers (a JSON
// number, not a string); null must be null; a list is correct if it has the same elements in any
// order; an object is correct if it has the same keys and every value is correct.
import { STEPS } from './normalize.js';

const textForm = (s) => s.trim().replace(/\s+/gu, ' ').toLowerCase();
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function parse(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false, value: undefined };
  }
}

export function sameValue(expected, actual) {
  if (expected === null) return actual === null;
  if (typeof expected === 'string') return typeof actual === 'string' && textForm(actual) === textForm(expected);
  if (typeof expected === 'number' || typeof expected === 'boolean') return actual === expected;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    const unused = [...actual];
    return expected.every((e) => {
      const i = unused.findIndex((a) => sameValue(e, a));
      if (i === -1) return false;
      unused.splice(i, 1);
      return true;
    });
  }
  if (isObject(expected)) {
    if (!isObject(actual)) return false;
    const keys = Object.keys(expected);
    return keys.length === Object.keys(actual).length
      && keys.every((k) => Object.hasOwn(actual, k) && sameValue(expected[k], actual[k]));
  }
  throw new Error(`Unexpected reference value: ${JSON.stringify(expected)}`);
}

// The reference with the expected_null fields set to null.
export function expectedAnswer(task) {
  const expected = { ...task.check.reference };
  for (const f of task.check.expected_null ?? []) expected[f] = null;
  return expected;
}

export function scoreK2(task, text, validate) {
  const raw = parse(text);
  const format = raw.ok && validate(raw.value) ? 1 : 0;
  const read = raw.ok ? raw : parse(STEPS.strip_code_fence(text));
  if (!read.ok || !isObject(read.value)) {
    return { format, correctness: 0, nullViolations: null, details: { parsed: read.ok, wrongFields: null } };
  }
  const answer = read.value;
  const expected = expectedAnswer(task);
  const fields = Object.keys(expected);
  const wrongFields = fields.filter((f) => !(Object.hasOwn(answer, f) && sameValue(expected[f], answer[f])));
  const nullViolations = (task.check.expected_null ?? [])
    .filter((f) => Object.hasOwn(answer, f) && answer[f] !== null).length;
  return {
    format,
    correctness: (fields.length - wrongFields.length) / fields.length,
    nullViolations,
    details: { parsed: true, wrongFields },
  };
}
