# Configuration (`config/`)

The configuration is frozen at the git tag `main-run` (CLAUDE.md, "Do not"): after it, these files are not changed.

## `config/models.json`
`maxOutputTokens` (16,000, the only generation parameter [L3]) and one entry per model:

| field | meaning |
|---|---|
| `id` | the model id in all rows (`openai`, `anthropic`, `google`, `deepseek`, `xai`, `luna`) |
| `provider`, `model` | provider and the model name sent to the API |
| `adapter` | `openaiCompatible`, `anthropic` or `google` (see [pipeline](pipeline.md)) |
| `apiKeyEnv` | the variable of `.env` that holds the key |
| `baseURL` | API address; always from here, so that no environment variable can change it |
| `maxTokensParam` | OpenAI-compatible only: `max_completion_tokens` or `max_tokens` |
| `completionIncludesReasoning` | OpenAI-compatible only: whether `completion_tokens` already includes reasoning tokens |

A new model needs only a row here (and a price in `pricing.json`) if its provider has an adapter. `luna` (gpt-6-luna) is the sixth model of the reproducibility test [M13].

## `config/pricing.json`
Prices per 1M tokens in USD, `priceListDate` and a `source` URL per model [M4]. Fields: `input`, `cachedInput`, `output`, cache write prices (`cacheWrite` for OpenAI, `cacheWrite5m` / `cacheWrite1h` for Anthropic), `maxInputTokens` (long-context band), `validUntil` (Gemini's introductory price). DeepSeek has `peak` and `offPeak` prices, `peakHoursUtc` and `offPeakDates` (Chinese public holidays). Used by [cost](cost.md). The screenshots of the price lists are in `results/prices/`.

## `config/profiles.json`
The two usage profiles [E3, PK6]: A "quality first" (correctness 0.40, format 0.25, stability 0.15, cost 0.10, latency 0.10) and B "cost first" (0.25, 0.10, 0.10, 0.40, 0.15); the weights of each sum to 1. `dailyVolume` 10,000 and `daysPerYear` 365 for the annual cost [PK7]. Used by [analysis](analysis.md).

## Run configs
`{ runId, description, models, tasks ("all" or a list), repeats }`. The run order is repeat by repeat, and within a repeat task by task, every model in turn [M7]. Command: `node src/runner/run.js --config <file>`.

| file | runId | what | requests |
|---|---|---|---|
| `config/run.probe.json` | `2026-11-03-probe` | probe request: K1-001 × 5 models (phase 1) | 5 |
| `config/run.pilot.json` | `pilot` | pilot run: 120 tasks × 5 models × 1 repeat [L5] | 600 |
| `config/run.main.json` | `main` | main run: 120 × 5 × 5 repeats [PK4] | 3000 |
| `config/run.luna.json` | `luna` | reproducibility test: 9 rule-scored tasks (one per category × difficulty) × 5 repeats, model `luna` [M13] | 45 |

The runIds of the pilot, main and Luna runs have no date (author's decision 3.11.2026); the time of every request is in its `tsStartUtc`.
