// Word and sentence counting and the language check, following the task bank definitions
// (task bank: counting_definitions, language_check).
import { franc } from 'franc';

// Word = a run of non-whitespace characters; separated by one or more Unicode whitespace characters.
export function countWords(text) {
  const t = text.trim();
  return t === '' ? 0 : t.split(/\s+/u).length;
}

// Estonian abbreviations whose period does not end a sentence.
const ABBREVIATIONS = ['mnt', 'tn', 'nt', 'jne', 'nr', 'dr', 'prof'];
const PROTECTED = [
  /https?:\/\/[^\s]*[^\s.!?]/giu, // URL (a trailing sentence mark is excluded)
  /www\.[^\s]*[^\s.!?]/giu,
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu, // email address
  /\d+[.,]\d+/gu, // decimal 2.4 or 2,4
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${ABBREVIATIONS.join('|')})\\.`, 'giu'), // abbreviations nt., mnt., ...
];

// A sentence ends with a run of .!? except inside protected constructs. A line break does not start a new sentence.
// Interpretation: if there is more text (a letter or digit) after the last sentence mark, it also counts as a sentence.
export function countSentences(text) {
  let t = text;
  for (const pattern of PROTECTED) t = t.replace(pattern, (m) => m.replace(/[.!?]/g, '_'));
  const parts = t.split(/[.!?]+/u);
  const terminators = parts.length - 1;
  const tail = parts[parts.length - 1];
  return terminators + (/[\p{L}\p{N}]/u.test(tail) ? 1 : 0);
}

// Is the output in the required language (lang: 'et' or 'en')?
// From the threshold (8 words) up: franc; shorter output: exclusion heuristic based on word lists.
export function isInLanguage(text, lang, languageCheck) {
  const lc = languageCheck;
  if (countWords(text) >= lc.long_output_min_words) {
    const options = lc.franc_candidates ? { only: lc.franc_candidates } : undefined;
    return franc(text, options) === lc.franc_codes[lang];
  }
  const words = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  if (lang === 'et') {
    const forbidden = new Set(lc.heuristic_et.english_words);
    return !words.some((w) => forbidden.has(w));
  }
  if (lang === 'en') {
    const forbidden = new Set(lc.heuristic_en.estonian_words);
    return !/[õäöü]/iu.test(text) && !words.some((w) => forbidden.has(w));
  }
  throw new Error(`Unknown language: ${lang}`);
}
