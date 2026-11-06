# CLAUDE.md

This repository is the software part of the diploma thesis **"Keelemudeli valiku mitmekriteeriumiline metoodika tarkvaraarenduses"** (A multi-criteria methodology for choosing a language model in software development; TalTech IT College, IADB, supervisor Toomas Lepikult).

It is based on the signed thesis proposal and the author's decisions in `kavandi_tooplaan.xlsx`. **Build only what is written in `PLAN.md`.** Do not add components, analyses or statistical methods that are not there. If something seems to be missing or a decision is unclear, ask the author.

The thesis text is not in the scope of this repository. The author writes it.

**Change log and documentation:** every change gets a row in `CHANGELOG.md` (I + the next number for an implementation, U + the next number for an update; the commit message starts with the IDs) and updates `docs/` (the file map in `docs/README.md` and the doc of the changed file) in the same commit. The rules are in `AGENTS.md`; `npm test` checks both (`test/changelog.test.js`, `test/docs.test.js`). Author's decisions 3.11.2026.

---

## Language

- **Everything in the repository is in English** (code, file names, comments, test names, messages, data field names, the task bank structure, documentation), **except the tasks** (author's decision 2.11.2026).
- **Stays in Estonian:** everything that reaches a tested model or the judge, or that answers are compared with: task inputs and instructions, the user message template text (`Tekst:`, `Skeem:`), references, allowed answers, rule values and regexes, K2 field names, rubrics, the judge-facing guidance in the task bank. Also the materials the raters see (Google Form, rater guide), because the raters are Estonian.
- **Talk to the author in Estonian**, using the thesis terms below.

## Terminology

The thesis uses Estonian terms; code and docs use the English ones. Keep the mapping consistent.

| Thesis (Estonian) | Code and docs (English) |
|---|---|
| mõõtmiskonveier (not "torustik") | measurement pipeline |
| testkogum, ülesandepank | test set, task bank |
| kasutusprofiil | usage profile |
| kriteerium | criterion |
| koondhinne | aggregate score |
| korrektsus, vormingukuulekus, hind/kulu, latentsus, stabiilsus | correctness, format compliance, cost, latency, stability |
| kohtunik | judge |
| proovipäring | probe request |
| pilootkatse | pilot run |
| põhimõõtmine | main run |
| kordus | repeat |
| toorrida | raw row |
| etalon, rubriik | reference, rubric |
| hinnaarvutuse kontroll | billing check |
| inimhindamine, hindaja | human evaluation, rater |

## What is built

- **Measurement pipeline:** a config-driven prototype that sends the same tasks to the models of five providers through their APIs. A new model can be added without changing code.
- **Test set:** 120 Estonian tasks in three categories and three difficulty levels (`data/task_bank_v1_3.json`).
- **Automatic scoring:** rules (112 tasks) and an LLM judge (8 faithfulness tasks).
- **Five criteria:** correctness, format compliance, cost, latency, stability; 5 repeats.
- **Decision model:** min-max normalization and the weighted sum model (WSM), two usage profiles, annual cost.
- **Sensitivity analysis** and **comparison by task category.**
- **Validation:** correctness of calculations, reproducibility (incl. a sixth model without code changes), billing check, human evaluation with two raters (linearly weighted Cohen's kappa).
- **Usability criterion [E2]:** four conditions, fixed before the main run in `docs/usability_criterion.md` (author's decisions 6.11.2026: the Excel check is part of condition 2, the 5% limit per provider, values at the threshold compared as reported).

## Principles

1. **Measure once, compute many times.** API calls are made only during measurement. Scoring, cost and analysis work on stored data.
2. **Raw data is never changed.** Rows are only appended to `results/raw/*.jsonl` and `results/judge/scores.jsonl`.
3. **The raw answer is not cleaned.** The answer is stored exactly as the API returned it.
4. **The same task text for every model.** Each request is one user message from the task bank template. No system prompt is used.
5. **Provider defaults.** No temperature, thinking mode, effort level or other generation parameters are sent to the tested models. The only parameter is the maximum output length of 16,000. Non-generative options needed for measurement are allowed (e.g. token counts in the stream).
6. **No tools or structured output modes are given to the tested models** (otherwise format compliance could not be measured, and they would add cost).
7. **Requests are streamed**, so that latency is measured the same way for every provider.
8. **An API error is not a wrong answer.** Failed requests are stored with status `error` and excluded from scoring. A refusal, an empty answer and a truncated answer are normal answers.
9. **Every request made with an experiment API key goes through the pipeline and is logged**, including probe requests. Otherwise the billing check does not add up.
10. **Cost is computed afterwards** as two sums: `costCriterion` (without cache, for the WSM) and `costBilled` (with cache, for the billing check). USD.
11. **The model version is pinned where the provider allows it.** The model name returned in the response is always stored.

## LLM judge

- Only 8 tasks: K3-026, K3-027, K3-028, K3-031, K3-033, K3-035, K3-037, K3-039.
- The judge is **Claude Opus 5.5 via Claude Code on the author's Pro subscription** (`claude -p`), not any of the tested models.
- The judge **never sees the model name**: it gets an anonymous file with only the source text, the instruction, the rubric and the answer. The key is kept separately.
- Each file is a **separate call**, 3 times, median. Never score several answers in one session.
- `ANTHROPIC_API_KEY` is removed from the child process environment; otherwise Claude Code bills through the API and mixes into the Sonnet cost.
- Exact flags: `PLAN.md` phase 3b (`src/judge/claude.js`). Checked 3.11.2026 with a real call: the judge has only the `StructuredOutput` tool of `--json-schema`, no MCP servers, and the answer comes from `claude-opus-5-5`.
- An answer from any other model (e.g. an automatic fallback) is an invalid answer, so a score never comes from a compared model.
- Commands: `node src/judge/prepare.js --run <runId>` (anonymous files), `node src/judge/run.js` (scores), then `node src/checkers/score.js --run <runId>` joins the median. `--dry-run` uses a fake judge under `results/dry-run/judge/`. `--check` uses the check set `results/judge-check/` (one file from the K3-026 sample answer, scored 2, 2, 2 by the real judge on 3.11.2026).
- Invalid answer (not JSON, no structured output, score not 0/1/2, another model) → a new attempt; 3 invalid in a row → `score: null`. Subscription usage limit → wait until the reset time in the message (15 min if it cannot be read). Other failures of the call → retries after 10/30/60 s, then the run stops without storing that score.
- Correctness = median of the valid scores / 2 (0 → 0, 1 → 0.5, 2 → 1); with no valid score, `null`.
- Author's decisions 3.11.2026: the handling of answers from other models, of call failures and of missing scores above; the `invalidAttempts` field; removing `ANTHROPIC_AUTH_TOKEN` too; the check set.

## Technology

- **Measurement pipeline:** Node.js 24, ESM.
  - `openai` (OpenAI, xAI and DeepSeek through the OpenAI-compatible API, with different `baseURL`)
  - `@anthropic-ai/sdk`
  - `@google/genai`
  - `ajv` (JSON schemas; compiled schemas are cached to avoid the "schema already exists" error)
  - `franc` (language identification; Estonian = `ekk`)
  - `dotenv`
  - tests: `node:test`
- **Judge:** Claude Code CLI (`claude -p`).
- **Analysis:** Python 3.11+, `pandas`, `numpy`, `scikit-learn`, `matplotlib`.
- **Human evaluation form:** Google Apps Script.

Before using any provider SDK or Claude Code flag, check its current documentation.

## Folder structure

Every file is described in `docs/` (file map: `docs/README.md`).

```
AGENTS.md            rules for agents: a change log row and the docs with every change
CHANGELOG.md         every implementation (I1, I2, …) and update (U1, U2, …)
docs/                documentation of every file (README.md = overview and file map)
config/
  models.json        models and the maximum output length
  pricing.json       prices (USD), price list date
  profiles.json      usage profile weights, daily volume 10,000
  run.probe.json     probe request (1 task × 5 models, phase 1)
  run.pilot.json     pilot run (1 repeat)
  run.main.json      main run (5 repeats)
  run.luna.json      reproducibility test (sixth model, 9 tasks × 5 repeats)
data/
  task_bank_v1_3.json
  task_bank_v1_2.json    original v1.2, unchanged
  category2_schemas.json
  schemas/
  CHANGES_v1_3.md
prompts/
  judge.txt          judge system prompt
src/
  adapters/          openaiCompatible.js, anthropic.js, google.js, fake.js
  runner/            measurement pipeline
  checkers/          rule-based scoring
  judge/             prepare.js, run.js, claude.js (the call), common.js
  cost/              cost calculation
  report/            pilot run report data
  paths.js, random.js, csv.js   result paths, seeded randomness, CSV
test/                Node tests (fixtures/ = sample answers, a stand-in for claude)
analysis/            Python analysis: run_all.py, criteria, decision model, figures, tests/
tools/
  apps_script/       creating the Google Form from the sample
results/
  raw/               raw rows
  dry-run/           raw/, scored/, judge/ of --dry-run (fake adapter, fake judge; ignored by git)
  scored/            score rows, manual_check.md for the manual check
  judge/             input/, key.csv, scores.jsonl
  judge-check/       the judge check set (one sample answer, real judge)
  cost/              cost
  human/             sample, key, rater scores
  figures/           tables and figures of the analysis (main run; figures/pilot/ = preview)
  pilot/             the pilot run report and the author's review files
  prices/            price list screenshots of a measurement day
  billing/           provider dashboard screenshots for the billing check (2026-11-06 = before the main run)
```

## Data formats

### Raw row (`results/raw/<runId>.jsonl`)

One row = one API request.

```json
{
  "key": "<runId>|<taskId>|<modelId>|<repeat>",
  "runId": "main",
  "taskId": "K2-026",
  "modelId": "deepseek",
  "modelRequested": "deepseek-flash",
  "modelVersion": "<from the response>",
  "repeat": 3,
  "tsStartUtc": "2026-11-20T14:03:11.482Z",
  "ttftMs": 412.7,
  "totalMs": 1893.4,
  "status": "ok",
  "error": null,
  "retries": [],
  "finishReason": "stop",
  "usage": { "input": 214, "cachedInput": 192, "output": 57, "reasoning": null },
  "usageRaw": { "<provider usage object, unchanged>": "…" },
  "text": "<the model's exact answer>"
}
```

- `usage.input`: all input, including the part read from cache.
- `usage.output`: all output, including reasoning tokens.
- `usage.cachedInput` and `usage.reasoning` are `null` if the provider does not report them.
- `usageRaw` (author's decision 2.11.2026): the provider's original usage object. Cost can be recomputed from it if the normalization turns out to be wrong. Raw rows are never changed.
- `ttftMs`: time from request start to the first non-empty chunk of answer text; reasoning is not counted (author's decision 2.11.2026). `null` if the answer has no text.
- Error row: `status: "error"`, `error: { "httpStatus", "message" }`; `modelVersion`, the times, `usage`, `usageRaw` and `text` are `null`.
- `tsStartUtc`, the times and the answer describe the last attempt. `retries` lists the earlier failed attempts of the same request, `[{ "tsStartUtc", "httpStatus", "message" }]`, so that every request made with the key is logged (principle 9; author's decision 3.11.2026). Rows written before phase 2 (the probe) do not have the field; read it as `[]`.

On start, the existing keys are read and skipped (an error row also counts as stored).

### Running the measurement pipeline (phase 2)

- `node src/runner/run.js --config config/run.<name>.json [--dry-run] [--limit N]`.
- The runIds `pilot`, `main` and `luna` have no date: the main run and Luna run after the tag `main-run`, when the configuration can no longer be changed, so a planned date in the runId could not be corrected (the pilot follows the same pattern). The date of every request is in `tsStartUtc` (author's decision 3.11.2026).
- `--dry-run`: the fake adapter for every model, no API requests, no keys; rows go to `results/dry-run/raw/<runId>.jsonl` (ignored by git), never into `results/raw`. The scoring and the judge have a `--dry-run` too and use the same layout under `results/dry-run/`.
- `--limit N`: at most N new requests in this run; rows already stored are not counted.
- Temporary errors (429, 5xx, timeout, dropped connection) [PK1]: up to 3 retries after 10 s, 30 s and 60 s; the timeout is 10 minutes per attempt, including reading the stream (author's decision 3.11.2026). Other API errors end the request at once.
- The run stops after 5 error rows in a row, overall or for one model (author's decision 3.11.2026). Fix the cause and run the same command again.
- Ctrl+C stops after the current request, so that it is still logged; a second Ctrl+C stops at once (author's decision 3.11.2026).

### Score row (`results/scored/<runId>.jsonl`)

`key`, `taskId`, `modelId`, `repeat`, `category`, `scoringMethod` (`rules` or `judge`), `format` (0/1), `correctness` (0…1), `nullViolations`.

- `correctness` is `null` for the 8 judge tasks until phase 3b joins the judge median.
- `nullViolations` (author's decision 3.11.2026, from the task bank's json_fields definition): K2 only, the number of `expected_null` fields that got a value; `null` for K1 and K3, and for a K2 answer from which no JSON object could be read.
- Error rows get no score row. The file is derived: `node src/checkers/score.js --run <runId>` writes it again from the raw rows.

### Scoring rules (phase 3) [M2, M3]

- **K1:** format = the answer, ignoring leading and trailing whitespace, case and one final period, is one of the allowed answers ("Tallinnas." → format 1, author's decision 3.11.2026; "Tallinnas?" or "Vastus: Tallinnas" → format 0); correctness = after the task's normalization steps it is one of the allowed answers.
- **K2:** format = `JSON.parse` of the unchanged answer succeeds and the JSON schema passes (code fence markers → format 0). Correctness is computed after removing code fence markers; no JSON object → 0. Text: whitespace normalized, case-insensitive; numbers: a JSON number with the same value (`"2"` is not `2`); `null` must be `null`; lists: the same elements in any order; objects: the same keys, every value correct. Correctness = share of correct top-level fields.
- **K3:** format = all length and structure rules pass (`max_words`, `min_words`, `sentence_count`, `max_line_breaks`); correctness = share of content rules passed (`contains`, `not_contains`, `regex_present`, `regex_absent`, `language`).
- **K3 judge tasks:** format = the length and structure rules of `extra_rules` only; the language rule there is not used, and K3-026 (no length rule) gets format 1 (author's decision 3.11.2026). Correctness comes from the judge.
- **Empty answer** (only whitespace) in K3: format 0, correctness 0 (judge tasks: format 0), because "at most N words" and "in Estonian" would hold for an empty text (author's decision 3.11.2026). It is still a normal answer, not an error. In K1 and K2 an empty answer gets 0 and 0 by the normal rules.
- **Manual check** (PLAN.md phase 3, done on the pilot run data, author's decision 3.11.2026): `node src/checkers/sample.js --run pilot` writes `results/scored/pilot.manual_check.md` with 20 rule scores drawn with a fixed seed, in turn from each category.

### Judge (`results/judge/`)

- `input/H####.json`: `{ "id", "sourceText", "instruction", "rubric", "answer" }`. No model name or key.
- `key.csv`: `id` → raw row `key`. The judge never sees it.
- `scores.jsonl`: `{ "id", "repeat" (1–3), "score" (0/1/2 or null), "justification", "model", "claudeCodeVersion", "ts", "invalidAttempts" }`. Rows are only appended.
  - `model`: the model(s) in the answer's `modelUsage`; `claudeCodeVersion`: the output of `claude --version`.
  - `invalidAttempts`: the invalid answers before this score, `[{ "reason", "model" }]`; three of them make `score` null.
- One judge set for all runs: IDs are unique across runs, and the key names the run. The judge's answer keys are `score` and `justification` (author's decision 3.11.2026; task bank item 1.12).

### Cost row (`results/cost/<runId>.jsonl`)

`key`, `costCriterion`, `costBilled` (USD).

- `node src/cost/cost.js --run <runId> [--dry-run]` writes the file again from the raw rows and `config/pricing.json`. Error rows get no cost row; an ok row without usage gets `null` in both.
- `costCriterion` = all input × input price + all output (reasoning included) × output price, as if every request were new → WSM.
- `costBilled` = (input − cached − written to cache) × input price + cached × cache price + written × cache write price + output × output price → billing check. Cache writes: Anthropic `cache_creation_input_tokens` (5 min / 1 h by `cache_creation`), OpenAI `prompt_tokens_details.cache_write_tokens` (30-minute price).
- DeepSeek: peak or off-peak by `tsStartUtc` (Mon–Fri 01:00–04:00 and 06:00–10:00 UTC, start included, end excluded; `offPeakDates` for Chinese public holidays), in both sums.
- A price that does not apply is an error, not a wrong number: Gemini after `validUntil` (31.12.2026), a prompt above `maxInputTokens` (OpenAI 272K, xAI from 200K), a non-standard `service_tier` / `serviceTier` / `speed`, or `inference_geo` other than `global`.
- Checked on the probe of 3.11.2026: the xAI `costBilled` equals xAI's own `cost_in_usd_ticks` (1 tick = 1e-10 USD).
- Prices: `config/pricing.json`, checked on the official price lists on 3.11.2026 (`priceListDate`, a `source` URL per model). Check again on the day of measurement and save the price lists.

### Human evaluation (`results/human/`)

- `sample.csv`: `answerId`, source text, task, answer. No model name.
- `key.csv`: `answerId` → `key`, scoring method. This file is not given to the raters.
- `scores_rater1.csv`, `scores_rater2.csv`: `answerId`, `score` (0, 1 or 2), `comment`.

### A run from start to end (pilot run, phase 5; the main run the same with `main`)

1. `node src/runner/run.js --config config/run.pilot.json` (API requests; resumable)
2. `node src/judge/prepare.js --run pilot`, then `node src/judge/run.js` (judge, Pro subscription)
3. `node src/checkers/score.js --run pilot` (rules + judge median), `node src/cost/cost.js --run pilot`
4. Review: `node src/report/pilot.js --run pilot` → `results/pilot/report_data.md` (errors, truncated answers, cost, time, suspicious tasks, judge status); `node src/checkers/sample.js --run pilot` → 20 rule scores; `node src/judge/review.js --run pilot` → 20 judge scores without model names (`results/pilot/judge_check.md`).
5. Analysis: `.venv/Scripts/python analysis/run_all.py` (the main run → `results/figures/`; `--run pilot` → `results/figures/pilot/`, a preview only).

### Analysis (phase 7, Python)

- Setup: `python -m venv .venv`, then `.venv/Scripts/pip install -r analysis/requirements.txt` (pinned versions). Tests: `.venv/Scripts/python -m unittest discover -s analysis/tests` (hand-calculated examples [M12]).
- `analysis/run_all.py` reads only the stored rows (raw, scored, cost) and writes all tables (CSV, decimal point, LF), the two sensitivity figures and `summary.md`. The same data gives byte-identical files [M13] (PNG without the software version in the metadata). Everything is in English (author's decision 3.11.2026).
- Criteria [M2–M6]: correctness and format = means over the answers (a missing judge correctness is left out and counted); cost = mean `costCriterion`; latency = median `totalMs` (TTFT median as additional information); stability = per task the population standard deviation (ddof=0) of the correctness of the answered repeats (a repeat that is an error row is left out: author's decision 3.11.2026), mean over the tasks. Errors and truncated answers are counted [PK1].
- Min-max [M8] with max = min → 1 for all (tolerance 1e-12); WSM [M9]; rank 1 = highest score; a tie keeps the model order of `config/models.json` and is reported (`tie`).
- Sensitivity [M10]: one weight from 0 to 1 in steps of 0.05, the others in proportion. A tie at the top that includes the previous winner is not a change of the winner (author's decision 3.11.2026); ties are listed separately (`ties`), and the original winner "holds" where it is first or shares the first place.
- Annual cost [PK7]: mean `costCriterion` × 10,000 × 365 (`config/profiles.json`), USD; EUR with one rate, `usdPerEur` in `analysis/settings.json` (now 1.1216, the author's figure of 3.11.2026; replace it with the ECB rate of the main run day [M4]).
- Categories [M11]: criteria and min-max within each category, the same weights. `wsm_check_input.csv` [M12] starts with the columns of the "Sisend" sheet of `analysis/wsm_check.xlsx` (correctness, format, cost, latency in s, stability, the Python scores), then the normalized values.
- Figure colours: the categorical order of the dataviz reference palette by the model's position in `config/models.json` (never by rank); every model also has its own marker, and the exact values are in `sensitivity.csv`.

## Models

| id | provider | model | adapter |
|---|---|---|---|
| openai | OpenAI | `gpt-6.1-terra` | openaiCompatible |
| anthropic | Anthropic | `claude-sonnet-5-5` | anthropic |
| google | Google | `gemini-3.8-flash` | google |
| deepseek | DeepSeek | `deepseek-flash` | openaiCompatible |
| xai | xAI | `grok-4.7` | openaiCompatible |
| luna (reproducibility test only) | OpenAI | `gpt-6-luna` | openaiCompatible |

API keys are only in `.env`, which is never committed.

## Do not

- Do not make real API calls or judge calls in tests. Use the `fake` adapter and a fake judge.
- Do not change or delete raw data rows.
- Do not send a system prompt, generation parameters or tools to the tested models.
- Do not use the judge for anything other than the 8 named tasks, and never show the model name to the judge.
- Do not make requests with the experiment API keys outside the pipeline.
- Do not change the test set, the template or the configuration after the git tag `main-run`.
- Do not make decisions that `PLAN.md` and `kavandi_tooplaan.xlsx` do not cover. Ask the author.
