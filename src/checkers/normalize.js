// Normalization of category 1 answers according to the task bank's 'normalizations'.
// Steps are applied in the order listed in the task.

// Estonian month names (answers are in Estonian).
const MONTHS = ['jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli', 'august',
  'september', 'oktoober', 'november', 'detsember'];
const pad2 = (n) => String(n).padStart(2, '0');

function toIsoDate(s) {
  let m = s.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})$/u); // 3.02.2025, 03.02.2025
  if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;
  m = s.match(/^(\d{1,2})\.\s*(\p{L}+)\s+(\d{4})$/u); // 3. veebruar 2025, 3. veebruaril 2025
  if (m) {
    const month = MONTHS.findIndex((name) => m[2].toLowerCase().startsWith(name));
    if (month >= 0) return `${m[3]}-${pad2(month + 1)}-${pad2(m[1])}`;
  }
  return s;
}

// Keys are the step names used in the task bank.
export const STEPS = {
  trim: (s) => s.trim(),
  lowercase: (s) => s.toLowerCase(),
  strip_final_punctuation: (s) => s.replace(/[.!?]$/u, ''),
  strip_code_fence: (s) => s.replace(/^\s*```[^\n]*\n?/u, '').replace(/\n?```\s*$/u, ''),
  // Estonian preambles: "vastus on" (the answer is), "vastus:" (answer:), "see on" (it is).
  strip_preamble: (s) => s.replace(/^(?:vastus\s+on\s*:?|vastus\s*:|see\s+on)\s*/iu, ''),
  date_iso: toIsoDate,
  // Thousands separators: whitespace incl. no-break space (U+00A0) and narrow no-break space (U+202F).
  decimal_point: (s) => s.replace(/(\d)[\s  ](?=\d{3}(?!\d))/gu, '$1').replace(/(\d),(\d)/gu, '$1.$2'),
};

export function normalize(text, steps) {
  return steps.reduce((s, name) => {
    const step = STEPS[name];
    if (!step) throw new Error(`Unknown normalization step: ${name}`);
    return step(s);
  }, text);
}
