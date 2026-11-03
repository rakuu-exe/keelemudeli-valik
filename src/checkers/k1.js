// Category 1 (exact_match) [M2, M3].
//   format      = the answer, ignoring leading and trailing whitespace, case and one final period,
//                 is one of the allowed answers ("Tallinnas." is format 1; the final period is
//                 ignored by the author's decision 3.11.2026, other marks such as "?" are not)
//   correctness = after the task's normalization steps the answer is one of the allowed answers
import { normalize } from './normalize.js';

const looseForm = (s) => s.trim().toLowerCase().replace(/\.$/u, '');

export function scoreK1(task, text) {
  const { allowed, normalize: steps } = task.check;
  const normalized = normalize(text, steps);
  return {
    format: allowed.some((a) => looseForm(a) === looseForm(text)) ? 1 : 0,
    correctness: allowed.includes(normalized) ? 1 : 0,
    details: { normalized },
  };
}
