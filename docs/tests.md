# Tests (`test/`, `analysis/tests/`)

No test makes a real API or judge call (CLAUDE.md): adapters get fake streams, the pipeline uses the fake adapter, the judge a fake call or a stand-in script.

```
npm test                                                   # all Node tests
npm run check                                              # the task bank check script only
.venv/Scripts/python -m unittest discover -s analysis/tests   # the Python analysis tests
```

| file | what it checks |
|---|---|
| `test/taskBank.test.js` | the phase 0 check script: 120 tasks, 40 per category, 10/15/15 difficulty levels, the v1.3 changes, all regexes compile, word boundaries, the template, every K1 allowed answer normalizes to itself, every K2 reference passes its schema, every K3 sample answer passes its rules |
| `test/text.test.js` | word and sentence counting with the definition examples; the language check (franc and the short-text heuristic) |
| `test/adapters.test.js` | each adapter against a fake SSE stream: the exact request body, usage normalization, TTFT, refusals, truncation, HTTP errors (retryable or not), aborting a stream with the signal; `config/models.json` |
| `test/runner.test.js` | raw row format, rounds, resume without duplicates, the file only grows, retries and waits, timeout, `tsStartUtc` of the last attempt, `--limit`, the stop rules, Ctrl+C, the run configs (5 / 600 / 3000 / 45 requests), the command line, dry-run paths |
| `test/scoring.test.js` | every reference gets the maximum score; each K1, K2 and K3 rule; judge-task format; empty answers; null violations; score rows; the manual check sample |
| `test/judge.test.js` | the prompt has the task bank texts word for word, English keys, the exact flags, the answer schema, no API key and an empty folder in the child process, the timeout, anonymous files (no model name or key), seeded IDs and order, interpreting answers (invalid, other model, usage limit, failures), the run (3 calls, resume, invalid, usage limit, failures, `--limit`), the median joined to the score rows |
| `test/cost.test.js` | pricing.json against models.json and PLAN.md, the DeepSeek peak hour boundaries, the two sums, cache reads and writes, prices that do not apply, the real probe rows (xAI equals its own reported cost) |
| `test/report.test.js` | the pilot report data (errors, truncated, suspicious tasks, Markdown in K1, cost estimate) and the blind judge review |
| `test/profiles.test.js` | `config/profiles.json`: five criteria, weights of E3, sums of 1, 10,000 a day |
| `test/docs.test.js` | the file map of `docs/README.md`: every file of the repository matches a row, every literal row exists, every row's doc names it |
| `test/changelog.test.js` | `CHANGELOG.md`: the I and U numbers run 1, 2, 3 … without gaps in the order of the rows, dates never go back, every row has a description and files |
| `analysis/tests/test_analysis.py` | hand-calculated examples [M12]: min-max (incl. all equal), WSM, ranking and ties, reweighting, the grid, switch points and ties in the sensitivity analysis, the criteria (stability, missing values, errors, truncated), annual cost |

## Fixtures
- `test/fixtures/k3_sample_answers.json`: one sample answer per K3 task that passes its rules (judge tasks: written to score 2); used by the task bank and scoring tests and by the judge check set. Never sent to a model.
- `test/fixtures/fake_claude.mjs`: a stand-in for `claude` that reports its environment, working folder, arguments and stdin (or hangs with `--hang`); used by `test/judge.test.js`.
