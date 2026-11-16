# Choosing a language model: a multi-criteria methodology

The software part of the diploma thesis **"Keelemudeli valiku mitmekriteeriumiline metoodika tarkvaraarenduses"** (A multi-criteria methodology for choosing a language model in software development), TalTech IT College, 2026. Author: Ragnar Rand; supervisor: Toomas Lepikult.

It measures the language models of five providers on the same 120 Estonian text-processing tasks, scores the answers automatically, and ranks the models for two usage profiles with a weighted sum model. The repository holds the code, the test set, the judge prompt, the rater guide and all the data of the study.

- **Code and documentation are in English; the tasks are in Estonian** (so is everything a model, the judge or a human rater sees).
- Every file is described in [`docs/`](docs/README.md). The rules and data formats are in [`CLAUDE.md`](CLAUDE.md), the work plan in [`PLAN.md`](PLAN.md), every change in [`CHANGELOG.md`](CHANGELOG.md).
- The results of the study: [`results/main/report.md`](results/main/report.md) and [`results/figures/summary.md`](results/figures/summary.md).

## What is here
M
| part | where | what it does |
|---|---|---|
| Test set | `data/task_bank_v1_3.json` | 120 tasks, 40 per category: K1 fact-based questions and classification (a short answer), K2 structured data extraction (JSON), K3 text processing and summarizing; three difficulty levels |
| Measurement pipeline | `src/runner/`, `src/adapters/` | sends every task to every model through the provider's API and stores one raw row per request; the only part that makes API requests |
| Automatic scoring | `src/checkers/` | correctness and format compliance by rules (112 tasks) |
| LLM judge | `src/judge/`, `prompts/judge.txt` | correctness of 8 faithfulness tasks: Claude Opus 5.5 through Claude Code, without the model name, 3 scores, median |
| Cost | `src/cost/`, `config/pricing.json` | the cost of every request from its token counts and the price list |
| Analysis | `analysis/` (Python) | five criteria, min-max normalization, weighted sum model, annual cost, sensitivity analysis, comparison by category |
| Validation | `analysis/tests/`, `analysis/wsm_check.xlsx`, `src/human/`, `tools/apps_script/`, `results/billing/` | hand-calculated tests, an independent Excel check, human evaluation with two raters, the billing check |

```
config/*.json + data/task_bank_v1_3.json
        │
        ▼
measurement pipeline ──► results/raw/<runId>.jsonl      (API requests)
        ├─► judge ─────► results/judge/                  (Claude Code)
        ├─► scoring ───► results/scored/<runId>.jsonl
        ├─► cost ──────► results/cost/<runId>.jsonl
        └─► analysis ──► results/figures/
```

API requests are made only by the measurement pipeline. Scoring, cost and analysis work on the stored rows, so they can be run again at any time without keys and without cost.

## Requirements

| for | you need |
|---|---|
| everything | [Node.js](https://nodejs.org/) 24 or newer |
| the analysis | Python 3.11 or newer (developed with 3.13) |
| a new measurement | API keys of the providers you measure (OpenAI, Anthropic, Google, DeepSeek, xAI) |
| the judge | the [Claude Code](https://claude.com/claude-code) CLI, logged in with a subscription that includes Claude Opus 5.5 |

No keys and no Claude Code are needed to run the tests, a dry run, or to compute the results again from the stored data.

The software was developed and run on Windows 11. The commands below use the Windows path of the Python environment, `.venv/Scripts/python`; on macOS and Linux it is `.venv/bin/python`.

## Installation

```
git clone https://github.com/rakuu-exe/keelemudeli-valik.git
cd keelemudeli-valik
npm ci
python -m venv .venv
.venv/Scripts/pip install -r analysis/requirements.txt
```

Check that everything works:

```
npm test
.venv/Scripts/python -m unittest discover -s analysis/tests
```

The tests make no API requests and no judge calls: they use a fake adapter and a fake judge.

## Compute the results again from the stored data

The raw rows of the study are in the repository, so the scores, the cost and the whole analysis can be derived again without any key:

```
node src/checkers/score.js --run main
node src/cost/cost.js --run main
.venv/Scripts/python analysis/run_all.py
```

The same data gives byte-identical files in `results/scored/`, `results/cost/` and `results/figures/`, so `git status` stays clean afterwards.

## Try the whole chain without keys (dry run)

`--dry-run` replaces every model with a fake adapter and the judge with a fake judge. Nothing is sent anywhere; all files go under `results/dry-run/`, which git ignores.

```
node src/runner/run.js --config config/run.pilot.json --dry-run
node src/judge/prepare.js --run pilot --dry-run
node src/judge/run.js --dry-run
node src/checkers/score.js --run pilot --dry-run
node src/cost/cost.js --run pilot --dry-run
.venv/Scripts/python analysis/run_all.py --run pilot --dry-run
```

## API keys

1. Copy `.env.example` to `.env` and add the keys. `.env` is ignored by git; never commit it.
2. Use a separate key or project for the experiment at every provider, and set a spending limit on it. Then the provider's dashboard shows exactly the requests of the experiment, and the computed cost can be compared with the bill.
3. Do not use these keys for anything else. Every request made with them must go through the pipeline, which logs it; otherwise the billing check does not add up.

The pipeline reads the keys only from `.env`, not from the system environment.

| variable | provider | model in the study |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI | `gpt-6.1-terra` (and `gpt-6-luna` in the reproducibility test) |
| `ANTHROPIC_API_KEY` | Anthropic | `claude-sonnet-5-5` |
| `GEMINI_API_KEY` | Google | `gemini-3.8-flash` |
| `DEEPSEEK_API_KEY` | DeepSeek | `deepseek-flash` |
| `XAI_API_KEY` | xAI | `grok-4.7` |

## A measurement from start to end

A run is described by a config file: `{ runId, description, models, tasks, repeats }`. The run configs of the study are `config/run.probe.json` (1 task × 5 models), `run.pilot.json` (120 × 5 × 1 repeat = 600 requests), `run.main.json` (120 × 5 × 5 = 3000 requests) and `run.luna.json` (the reproducibility test).

**The rows of these runs are already stored, and stored requests are skipped.** Running the same config again does nothing. For a new measurement, copy a run config and give it a new `runId`, then use that name instead of `<runId>` below.

**1. Measure** (API requests; costs money):

```
node src/runner/run.js --config config/run.<name>.json
```

- One raw row per request is appended to `results/raw/<runId>.jsonl`: the exact answer, the token counts, the times, the model version.
- Resumable: run the same command again and it continues where it stopped. `--limit N` makes at most N new requests.
- Temporary errors (429, 5xx, timeout) are retried up to 3 times. The run stops after 5 error rows in a row; fix the cause and run the command again.
- Ctrl+C stops after the current request, so that it is still logged.
- For orientation: the main run of the study took about 3.5 hours and was billed about 5.7 USD in total at the prices of November 2026.

**2. Judge** (Claude Code; see the next section):

```
node src/judge/prepare.js --run <runId>
node src/judge/run.js
```

**3. Score and cost** (from the stored rows):

```
node src/checkers/score.js --run <runId>
node src/cost/cost.js --run <runId>
```

**4. Analysis:**

```
.venv/Scripts/python analysis/run_all.py --run <runId>
```

Without `--run` it analyses the main run and writes to `results/figures/`; any other run goes to `results/figures/<runId>/` and is marked as a preview. The output is the criteria per model, the normalized values, the aggregate scores and ranks for both usage profiles, the annual cost, the sensitivity analysis (tables and two figures), the comparison by category and `summary.md`.

**Optional review tools** (used on the pilot run): `node src/report/pilot.js --run <runId>` (errors, truncated answers, cost, time, suspicious tasks), `node src/checkers/sample.js --run <runId>` (20 rule scores for a manual check), `node src/judge/review.js --run <runId>` (20 judge scores for a blind review).

Before measuring, check the prices in `config/pricing.json` against the providers' current price lists; the cost is computed from that file.

## The LLM judge

Eight K3 tasks ask whether a summary or a rewrite stays faithful to the source text, which rules cannot check. Their correctness comes from a judge: Claude Opus 5.5, called through Claude Code (`claude -p`) on a subscription. It is not one of the compared models.

Setup:

1. Install Claude Code and log in with a subscription (`claude`, then `/login`).
2. Check with `/model` that Claude Opus 5.5 is available.

How it works:

- `prepare.js` writes one anonymous file per answer to `results/judge/input/`: the source text, the instruction, the rubric and the answer. **The judge never sees the model name**; the key that links a file to its raw row is kept separately in `results/judge/key.csv`.
- `run.js` scores every file 3 times, each in a separate call with a new session, and appends the scores (0, 1 or 2) to `results/judge/scores.jsonl`. It is resumable.
- `score.js` then takes the median of the three scores: correctness = median / 2.
- `ANTHROPIC_API_KEY` is removed from the environment of the judge process. Otherwise Claude Code would bill the judge through the API key of the experiment and mix it into the measured cost.
- An answer from any model other than `claude-opus-5-5` is invalid and is asked again, so a score never comes from another model. If the subscription's usage limit is reached, the run waits until the reset time.
- The exact flags of the call are in `src/judge/claude.js`; the system prompt is `prompts/judge.txt`.

`results/judge-check/` holds a check set: one sample answer that the real judge scored 2, 2, 2 on 3.11.2026.

## Adding a model

A new model needs no code change if its provider already has an adapter (OpenAI-compatible, Anthropic, Google):

1. Add a row to `config/models.json` (see [`docs/config.md`](docs/config.md) for the fields).
2. Add its prices to `config/pricing.json`.
3. Add its key to `.env` if it is a new provider.
4. Make a run config that names the model, and run the steps above.

The reproducibility test of the study did exactly this with a sixth model: `gpt-6-luna` and `config/run.luna.json`.

## Human evaluation

Two raters score 60 answers of the main run on the scale 0/1/2 without model names; the agreement with the automatic scoring is the linearly weighted Cohen's kappa. The steps are in [`docs/human.md`](docs/human.md):

```
node src/human/sample.js                           # the sample of 60 (already drawn: results/human/sample.csv)
# create the Google Form: tools/apps_script/create_form.gs with sample.csv and rater_guide.txt in Google Drive
node src/human/import.js --file results/human/form_responses.csv    # the raters' scores
.venv/Scripts/python analysis/human_eval.py        # kappa → results/human/kappa.csv
```

## The rules of the measurement

The full list is in [`CLAUDE.md`](CLAUDE.md). The main ones:

- Every model gets the same single user message; no system prompt, no tools, no structured output mode.
- No generation parameters are sent (provider defaults); the only parameter is the maximum output length of 16,000 tokens.
- Requests are streamed, so that latency is measured the same way for every provider.
- The raw answer is stored exactly as the API returned it, and raw rows are never changed.
- An API error is not a wrong answer: failed requests are stored as error rows and left out of the scoring.
- The test set, the message template and the configuration were frozen at the git tag `main-run`, before the main run.

A new measurement will not give the same raw rows as the study: the providers change their models and prices, and the answers of a model vary from request to request. What can be reproduced exactly is everything computed from the stored rows.

## Use of generative AI

The code, the tests, the documentation and the reports of this repository were written with [Claude Code](https://claude.com/claude-code) (Anthropic; the models Claude Opus 5.5 and Claude Fable 5.2). It worked from the author's signed thesis proposal, the work plan ([`PLAN.md`](PLAN.md)) and the author's decisions, which are recorded with their dates in [`CLAUDE.md`](CLAUDE.md) and [`CHANGELOG.md`](CHANGELOG.md). Every commit made this way ends with the line `Co-Authored-By: Claude …`.

The 120 tasks of the test set were written by the author (the author's statement, 16.11.2026). The changes from version 1.2 to 1.3 ([`data/CHANGES_v1_3.md`](data/CHANGES_v1_3.md)) were made with Claude Code on the author's decisions.

The author made the decisions, started the main run and the reproducibility test, and did the checks that are the author's by the plan: the review of 20 rule scores and 20 judge scores of the pilot run, the Excel check of the decision model, the price list and dashboard screenshots, and the Google Form for the raters.

Claude Opus 5.5 is also the LLM judge of the study (see above). That is a part of the method and separate from the writing of the code.

## Licence

- **Code and configuration** (`src/`, `test/`, `analysis/*.py`, `tools/apps_script/create_form.gs`, `config/`, the package files): the MIT License, [`LICENSE`](LICENSE).
- **Test set, judge prompt, rater guide, data and documentation** (`data/`, `prompts/`, `tools/apps_script/rater_guide.txt`, `results/`, `analysis/wsm_check.xlsx`, `docs/` and the other Markdown files): Creative Commons Attribution 4.0 International, [`LICENSE-CC-BY-4.0`](LICENSE-CC-BY-4.0). Attribution: Ragnar Rand, "Keelemudeli valiku mitmekriteeriumiline metoodika tarkvaraarenduses", TalTech, 2026.
- **Not covered by either licence:** the screenshots in `results/prices/` and `results/billing/`. They show the pages of the providers and are here only as evidence of the prices and the billed amounts.
