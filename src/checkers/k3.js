// Category 3 (rules; judge tasks: extra_rules) [M2, M3].
//   format      = all length and structure rules are met
//   correctness = share of content rules passed (required facts, language, forbidden content);
//                 for the 8 judge tasks it comes from the judge (phase 3b), here null
// Judge tasks: only the length and structure rules of extra_rules count, as format; K3-026 has none,
// so its format is 1 (author's decision 3.11.2026).
// An empty answer (only whitespace) gets format 0 and correctness 0: the rules cannot pass it, as
// "at most N words" and "in Estonian" would hold for an empty text (author's decision 3.11.2026).
// It is still a normal answer, not an error.
import { checkRules } from './rules.js';

export const FORMAT_RULES = new Set(['max_words', 'min_words', 'sentence_count', 'max_line_breaks']);

export function scoreK3(task, text, bank) {
  const judged = task.check.type === 'judge';
  const rules = judged
    ? task.check.extra_rules.filter((r) => FORMAT_RULES.has(r.rule))
    : task.check.rules;
  if (!judged && !rules.some((r) => !FORMAT_RULES.has(r.rule))) {
    throw new Error(`${task.id}: no content rules`);
  }
  if (text.trim() === '') {
    return { format: 0, correctness: judged ? null : 0, details: { empty: true, rules: [] } };
  }
  const results = checkRules(rules, text, bank);
  const format = results.filter((r) => FORMAT_RULES.has(r.rule.rule)).every((r) => r.passed) ? 1 : 0;
  if (judged) return { format, correctness: null, details: { empty: false, rules: results } };
  const content = results.filter((r) => !FORMAT_RULES.has(r.rule.rule));
  return {
    format,
    correctness: content.filter((r) => r.passed).length / content.length,
    details: { empty: false, rules: results },
  };
}
