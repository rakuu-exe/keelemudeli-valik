# Documentation

The software part of the thesis "Keelemudeli valiku mitmekriteeriumiline metoodika tarkvaraarenduses". The rules of the project are in [`CLAUDE.md`](../CLAUDE.md) and the work plan in [`PLAN.md`](../PLAN.md); these docs describe the files. Every file of the repository is in the file map below, with the doc that describes it.

**Keep the docs up to date with every change** ([`AGENTS.md`](../AGENTS.md)). `npm test` checks the file map (`test/docs.test.js`): every file must match a row, every row must still exist, and the doc of a row must name its file.

## How the parts fit together

```
config/*.json + data/task_bank_v1_3.json
        │
        ▼
measurement pipeline (src/runner, src/adapters) ──► results/raw/<runId>.jsonl   (API requests; the only place with API calls)
        │
        ├─► judge (src/judge, claude -p) ─────────────► results/judge/            (8 judge tasks, 3 scores each)
        │
        ├─► scoring (src/checkers) ◄── results/judge ─► results/scored/<runId>.jsonl
        │
        ├─► cost (src/cost) ◄── config/pricing.json ──► results/cost/<runId>.jsonl
        │
        └─► analysis (analysis/, Python) ◄── raw + scored + cost ─► results/figures/
```

The order of one run is in CLAUDE.md, "A run from start to end".

## Docs

| doc | what it covers |
|---|---|
| [project.md](project.md) | the files in the root: rules, plan, package, git settings |
| [config.md](config.md) | `config/`: models, prices, usage profiles, run configs |
| [data.md](data.md) | `data/`: the task bank, the JSON schemas, the change log |
| [pipeline.md](pipeline.md) | `src/runner/`, `src/adapters/` and the shared modules in `src/` |
| [scoring.md](scoring.md) | `src/checkers/`: rule-based scoring and the manual check sample |
| [judge.md](judge.md) | `src/judge/` and `prompts/`: the LLM judge |
| [cost.md](cost.md) | `src/cost/`: costCriterion and costBilled |
| [reports.md](reports.md) | `src/report/`: the pilot run report data |
| [analysis.md](analysis.md) | `analysis/`: criteria, min-max, WSM, sensitivity, figures |
| [tests.md](tests.md) | `test/` and `analysis/tests/` |
| [results.md](results.md) | `results/`: every kind of stored and derived data |

## File map

A `*` stands for any characters except `/` (one file name part).

| file | doc | purpose |
|---|---|---|
| `AGENTS.md` | [project](project.md) | rules for agents and contributors: update the docs with every change |
| `CLAUDE.md` | [project](project.md) | project instructions: principles, formats, decisions |
| `PLAN.md` | [project](project.md) | the work plan, phase by phase |
| `package.json` | [project](project.md) | Node package: dependencies and npm scripts |
| `package-lock.json` | [project](project.md) | exact versions of the Node dependencies |
| `.env.example` | [project](project.md) | template of the API key file `.env` |
| `.gitignore` | [project](project.md) | files git ignores (keys, dependencies, dry runs) |
| `.gitattributes` | [project](project.md) | LF line endings; binary files |
| `docs/*.md` | [project](project.md) | this documentation |
| `config/models.json` | [config](config.md) | the models and the maximum output length |
| `config/pricing.json` | [config](config.md) | the prices per 1M tokens (USD) |
| `config/profiles.json` | [config](config.md) | the usage profiles (WSM weights) and the daily volume |
| `config/run.probe.json` | [config](config.md) | run config: probe request |
| `config/run.pilot.json` | [config](config.md) | run config: pilot run |
| `config/run.main.json` | [config](config.md) | run config: main run |
| `config/run.luna.json` | [config](config.md) | run config: reproducibility test with the sixth model |
| `data/task_bank_v1_3.json` | [data](data.md) | the test set: 120 tasks, templates, scoring rules |
| `data/task_bank_v1_2.json` | [data](data.md) | the original v1.2 task bank, unchanged |
| `data/CHANGES_v1_3.md` | [data](data.md) | what changed from v1.2 to v1.3 and why |
| `data/category2_schemas.json` | [data](data.md) | register: K2 task → JSON schema file |
| `data/schemas/K2-*.schema.json` | [data](data.md) | the JSON schema of each K2 task (40 files) |
| `src/taskBank.js` | [pipeline](pipeline.md) | loading the task bank; building the user message |
| `src/paths.js` | [pipeline](pipeline.md) | where the results are (real and dry run) |
| `src/random.js` | [pipeline](pipeline.md) | seeded randomness (samples, judge IDs) |
| `src/csv.js` | [pipeline](pipeline.md) | minimal CSV reading and writing |
| `src/runner/run.js` | [pipeline](pipeline.md) | the measurement pipeline (command line) |
| `src/runner/retry.js` | [pipeline](pipeline.md) | retries and the request timeout |
| `src/runner/rawRows.js` | [pipeline](pipeline.md) | raw rows: building, appending, reading |
| `src/adapters/index.js` | [pipeline](pipeline.md) | choosing the adapter of a model |
| `src/adapters/common.js` | [pipeline](pipeline.md) | shared adapter code: ApiError, keys, timing |
| `src/adapters/openaiCompatible.js` | [pipeline](pipeline.md) | OpenAI, xAI, DeepSeek (Chat Completions, streamed) |
| `src/adapters/anthropic.js` | [pipeline](pipeline.md) | Anthropic (Messages API, streamed) |
| `src/adapters/google.js` | [pipeline](pipeline.md) | Google Gemini (streamed) |
| `src/adapters/fake.js` | [pipeline](pipeline.md) | fake adapter for tests and dry runs |
| `src/checkers/score.js` | [scoring](scoring.md) | scoring of a run (command line) |
| `src/checkers/k1.js` | [scoring](scoring.md) | K1: exact match |
| `src/checkers/k2.js` | [scoring](scoring.md) | K2: JSON fields |
| `src/checkers/k3.js` | [scoring](scoring.md) | K3: rules; format of the judge tasks |
| `src/checkers/rules.js` | [scoring](scoring.md) | the K3 rules |
| `src/checkers/text.js` | [scoring](scoring.md) | word and sentence counting, language check |
| `src/checkers/normalize.js` | [scoring](scoring.md) | K1 normalization steps |
| `src/checkers/regex.js` | [scoring](scoring.md) | building the regex of a rule |
| `src/checkers/schemas.js` | [scoring](scoring.md) | compiled and cached K2 JSON schemas |
| `src/checkers/sample.js` | [scoring](scoring.md) | 20 rule scores for the author's manual check |
| `src/judge/prepare.js` | [judge](judge.md) | anonymous judge files and the key |
| `src/judge/run.js` | [judge](judge.md) | the judge run: 3 scores per file |
| `src/judge/claude.js` | [judge](judge.md) | one `claude -p` call |
| `src/judge/common.js` | [judge](judge.md) | judge input, answer schema, reading a judge set, median |
| `src/judge/review.js` | [judge](judge.md) | 20 judge scores for the author's blind review |
| `prompts/judge.txt` | [judge](judge.md) | the judge's system prompt (Estonian) |
| `src/cost/cost.js` | [cost](cost.md) | the two cost sums of a run (command line) |
| `src/report/pilot.js` | [reports](reports.md) | data of the pilot run report |
| `analysis/run_all.py` | [analysis](analysis.md) | all tables and figures with one command |
| `analysis/wsm_check.xlsx` | [analysis](analysis.md) | the author's independent Excel check of min-max and WSM [M12] |
| `analysis/common.py` | [analysis](analysis.md) | loading the stored rows and the settings |
| `analysis/criteria.py` | [analysis](analysis.md) | the five criteria per model |
| `analysis/decision.py` | [analysis](analysis.md) | min-max, WSM, ranking, sensitivity, annual cost |
| `analysis/figures.py` | [analysis](analysis.md) | the sensitivity figures |
| `analysis/settings.json` | [analysis](analysis.md) | exchange rate and sensitivity step |
| `analysis/requirements.txt` | [analysis](analysis.md) | pinned Python packages |
| `analysis/tests/test_analysis.py` | [tests](tests.md) | Python unit tests with hand-calculated examples |
| `test/adapters.test.js` | [tests](tests.md) | adapters against fake streams; abort signal; models.json |
| `test/runner.test.js` | [tests](tests.md) | pipeline: raw rows, rounds, resume, retries, stop rules, run configs |
| `test/scoring.test.js` | [tests](tests.md) | scoring rules; every reference gets the maximum score |
| `test/judge.test.js` | [tests](tests.md) | judge: flags, child process, anonymity, answers, resume |
| `test/cost.test.js` | [tests](tests.md) | cost sums, peak hours, cache, probe rows |
| `test/report.test.js` | [tests](tests.md) | pilot report data and the judge review |
| `test/profiles.test.js` | [tests](tests.md) | the usage profiles |
| `test/taskBank.test.js` | [tests](tests.md) | the task bank check script (phase 0) |
| `test/text.test.js` | [tests](tests.md) | word and sentence counting, language check |
| `test/docs.test.js` | [tests](tests.md) | this file map against the files of the repository |
| `test/fixtures/k3_sample_answers.json` | [tests](tests.md) | a sample answer for every K3 task |
| `test/fixtures/fake_claude.mjs` | [tests](tests.md) | a stand-in for `claude` in the judge tests |
| `results/raw/*.jsonl` | [results](results.md) | raw rows: one API request per row (only appended) |
| `results/scored/*.jsonl` | [results](results.md) | score rows (derived) |
| `results/scored/*.manual_check.md` | [results](results.md) | 20 rule scores for the author's manual check |
| `results/cost/*.jsonl` | [results](results.md) | cost rows (derived) |
| `results/judge/input/H*.json` | [results](results.md) | anonymous judge files |
| `results/judge/key.csv` | [results](results.md) | judge file ID → raw row key |
| `results/judge/scores.jsonl` | [results](results.md) | judge scores (only appended) |
| `results/judge-check/input/H*.json` | [results](results.md) | the judge check file (sample answer) |
| `results/judge-check/key.csv` | [results](results.md) | key of the judge check file |
| `results/judge-check/scores.jsonl` | [results](results.md) | the judge's scores of the check file |
| `results/pilot/report.md` | [results](results.md) | the pilot run report and the author's decisions |
| `results/pilot/report_data.md` | [results](results.md) | generated data of the pilot run report |
| `results/pilot/judge_check.md` | [results](results.md) | 20 judge scores with the author's blind scores |
| `results/prices/*/README.md` | [results](results.md) | what the price list screenshots of a day show |
| `results/prices/*/*.png` | [results](results.md) | price list screenshots of a measurement day |
| `results/figures/*.csv` | [results](results.md) | tables of the analysis (main run) |
| `results/figures/*.png` | [results](results.md) | figures of the analysis (main run) |
| `results/figures/*.md` | [results](results.md) | `summary.md`: the main tables of the analysis (main run) |
| `results/figures/*/*` | [results](results.md) | analysis of another run, a preview only (e.g. `pilot`) |
