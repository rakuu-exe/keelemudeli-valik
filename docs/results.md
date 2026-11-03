# Results (`results/`)

Raw data (raw rows, judge scores) is only appended to, never changed (principle 2). Everything else is derived and written again from it. Dry runs use the same layout under `results/dry-run/`, which git ignores. The exact formats are in CLAUDE.md, "Data formats".

## Raw data
| file | content |
|---|---|
| `results/raw/*.jsonl` | one row per API request: key, run, task, model, model version, repeat, start time, TTFT, total time, status, error, earlier failed attempts (`retries`), finish reason, normalized and original usage, the exact answer. Written by `src/runner/run.js`. Runs: `2026-11-03-probe`, `pilot`; later `main`, `luna` |
| `results/judge/input/H*.json` | anonymous judge files (source text, instruction, rubric, answer; no model name or key); `src/judge/prepare.js` |
| `results/judge/key.csv` | `id,key`: judge file → raw row key; never shown to the judge |
| `results/judge/scores.jsonl` | one row per judge score: id, repeat 1–3, score (0/1/2 or null), justification, model, Claude Code version, time, invalid attempts; `src/judge/run.js` |

## Derived data
| file | content |
|---|---|
| `results/scored/*.jsonl` | one score row per answered request: key, task, model, repeat, category, scoring method, format, correctness, null violations; `src/checkers/score.js` |
| `results/cost/*.jsonl` | key, costCriterion, costBilled (USD); `src/cost/cost.js` |

## Review and report files
| file | content |
|---|---|
| `results/scored/*.manual_check.md` | 20 rule scores for the author's manual check, with the author's "Check" notes; `src/checkers/sample.js` |
| `results/pilot/report.md` | the pilot run report: measurement, judge, findings F1–F8 with their places, the author's decisions and review (written by hand) |
| `results/pilot/report_data.md` | the generated data of the report; `src/report/pilot.js` |
| `results/pilot/judge_check.md` | 20 judge scores without model names, with the author's blind scores; `src/judge/review.js` |

## Judge check set
| file | content |
|---|---|
| `results/judge-check/input/H*.json` | one judge file from the K3-026 sample answer (not a model answer) |
| `results/judge-check/key.csv` | its key, `sample\|K3-026` (not a raw row key) |
| `results/judge-check/scores.jsonl` | the real judge's three scores of it (2, 2, 2 on 3.11.2026) |

## Price lists
| file | content |
|---|---|
| `results/prices/*/*.png` | screenshots of the five official price lists on a measurement day (folder = date) [M4] |
| `results/prices/*/README.md` | which screenshot is which provider, with the sources |

## Analysis
| file | content |
|---|---|
| `results/figures/*.csv` | the tables of `analysis/run_all.py` for the main run (see [analysis](analysis.md)) |
| `results/figures/*.png` | the sensitivity figures of the main run |
| `results/figures/*.md` | `summary.md`: the main tables of the main run for reading |
| `results/figures/*/*` | the same for another run, a preview only (e.g. `results/figures/pilot/`) |
