# Results (`results/`)

Raw data (raw rows, judge scores) is only appended to, never changed (principle 2). Everything else is derived and written again from it. Dry runs use the same layout under `results/dry-run/`, which git ignores. The exact formats are in CLAUDE.md, "Data formats".

## Raw data
| file | content |
|---|---|
| `results/raw/*.jsonl` | one row per API request: key, run, task, model, model version, repeat, start time, TTFT, total time, status, error, earlier failed attempts (`retries`), finish reason, normalized and original usage, the exact answer. Written by `src/runner/run.js`. Runs: `2026-11-03-probe`, `pilot`, `main` (6.–7.11.2026), `luna` (7.11.2026) |
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
| `results/main/report.md` | the main run report: measurement, judge, criteria, findings, decision model, reproducibility, the billing check, the human evaluation with the author's review of the 12 answers where a rater and the automatic score differ, the usability table [E2] and what is still open (written by hand) |

## Human evaluation
| file | content |
|---|---|
| `results/human/sample.csv` | the human evaluation sample [M14]: `answerId`, `sourceText`, `task`, `answer`; 60 answers of the main run, shuffled, without model names; `src/human/sample.js` (see [human](human.md)) |
| `results/human/key.csv` | `answerId` → raw row `key` and `scoringMethod`; not given to the raters |
| `results/human/form_responses.csv` | the responses of the Google Form as downloaded (15.11.2026), unchanged: `Ajatempel`, `Hindaja` (1 or 2), for every answer the choice (`A01`, "2 – õige") and the comment (`A01 kommentaar`); one row per rater, no names; the input of `src/human/import.js` |
| `results/human/scores_rater*.csv` | the raters' scores: `answerId`, `score` (0/1/2), `comment`; `src/human/import.js`; never overwritten |
| `results/human/kappa.csv` | the linearly weighted Cohen's kappa [M14]: `subset` (all / judge), `pair` (r1-r2, r1-auto, r2-auto), `n`, `kappa` (empty when not defined); derived, `analysis/human_eval.py` writes it again from the score files and `results/scored/main.jsonl` |

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

## Provider dashboards
| file | content |
|---|---|
| `results/billing/*/*.png` | screenshots of the five providers' usage and spend pages on a day (folder = date), for the billing check [PK9]; the main run's spend = a later screenshot minus the one before it. The account identity (name, e-mail, project and team IDs) is covered with grey boxes; the numbers are unchanged |
| `results/billing/*/README.md` | which screenshot is which provider, what it shows and the computed `costBilled` at that time |

## Analysis
| file | content |
|---|---|
| `results/figures/*.csv` | the tables of `analysis/run_all.py` for the main run (see [analysis](analysis.md)) |
| `results/figures/*.png` | the sensitivity figures of the main run |
| `results/figures/*.md` | `summary.md`: the main tables of the main run for reading |
| `results/figures/*/*` | the same for another run, a preview only (e.g. `results/figures/pilot/`) |
