# CLAUDE.md

This repository is the software part of the diploma thesis **"Keelemudeli valiku mitmekriteeriumiline metoodika tarkvaraarenduses"** (A multi-criteria methodology for choosing a language model in software development; TalTech IT College, IADB, supervisor Toomas Lepikult).

It is based on the signed thesis proposal and the author's decisions in `kavandi_tooplaan.xlsx`. **Build only what is written in `PLAN.md`.** Do not add components, analyses or statistical methods that are not there. If something seems to be missing or a decision is unclear, ask the author.

The thesis text is not in the scope of this repository. The author writes it.

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
- Exact flags: `PLAN.md` phase 3b.

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

```
config/
  models.json        models and the maximum output length
  pricing.json       prices (USD), price list date
  profiles.json      usage profile weights, daily volume 10,000
  run.probe.json     probe request (1 task × 5 models, phase 1)
  run.pilot.json     pilot run (1 repeat)
  run.main.json      main run (5 repeats)
  run.luna.json      reproducibility test (sixth model, ~10 tasks)
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
  judge/             prepare.js, run.js
  cost/              cost calculation
test/
analysis/            Python analysis, run_all.py
tools/
  apps_script/       creating the Google Form from the sample
results/
  raw/               raw rows
  scored/            scores
  judge/             input/, key.csv, scores.jsonl
  cost/              cost
  human/             sample, key, rater scores
  figures/           tables and figures
```

## Data formats

### Raw row (`results/raw/<runId>.jsonl`)

One row = one API request.

```json
{
  "key": "<runId>|<taskId>|<modelId>|<repeat>",
  "runId": "2026-11-20-main",
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

On start, the existing keys are read and skipped.

### Score row (`results/scored/<runId>.jsonl`)

`key`, `taskId`, `modelId`, `repeat`, `category`, `scoringMethod` (`rules` or `judge`), `format` (0/1), `correctness` (0…1).

### Judge (`results/judge/`)

- `input/H####.json`: `{ "id", "sourceText", "instruction", "rubric", "answer" }`. No model name or key.
- `key.csv`: `id` → raw row `key`. The judge never sees it.
- `scores.jsonl`: `{ "id", "repeat" (1–3), "score" (0/1/2 or null), "justification", "model", "claudeCodeVersion", "ts" }`.

### Cost row (`results/cost/<runId>.jsonl`)

`key`, `costCriterion`, `costBilled` (USD).

### Human evaluation (`results/human/`)

- `sample.csv`: `answerId`, source text, task, answer. No model name.
- `key.csv`: `answerId` → `key`, scoring method. This file is not given to the raters.
- `scores_rater1.csv`, `scores_rater2.csv`: `answerId`, `score` (0, 1 or 2), `comment`.

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
