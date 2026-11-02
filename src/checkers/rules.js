// Category 3 rules: each rule yields true (passed) or false.
import { countWords, countSentences, isInLanguage } from './text.js';
import { buildRegex } from './regex.js';

const asList = (v) => (Array.isArray(v) ? v : [v]);

export function checkRule(rule, text, bank) {
  const { value } = rule;
  switch (rule.rule) {
    case 'max_words': return countWords(text) <= value;
    case 'min_words': return countWords(text) >= value;
    case 'contains': return asList(value).every((s) => text.includes(s));
    case 'not_contains': return asList(value).every((s) => !text.includes(s));
    case 'language': return isInLanguage(text, value, bank.language_check);
    case 'regex_present': return buildRegex(rule).test(text);
    case 'regex_absent': return !buildRegex(rule).test(text);
    case 'sentence_count': return countSentences(text) === value;
    case 'max_line_breaks': return (text.trim().match(/\n/g) ?? []).length <= value;
    default: throw new Error(`Unknown rule: ${rule.rule}`);
  }
}

// Returns the result of every rule so that tests can show which rule failed.
export function checkRules(rules, text, bank) {
  return rules.map((rule) => ({ rule, passed: checkRule(rule, text, bank) }));
}
