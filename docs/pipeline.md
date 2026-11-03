# Measurement pipeline (`src/runner/`, `src/adapters/`, shared modules)

The only part of the software that makes API requests. Every request goes through it and is logged as a raw row (principle 9).

## `src/runner/run.js`
```
node src/runner/run.js --config config/run.<name>.json [--dry-run] [--limit N]
```
Builds the plan (`buildPlan`: repeat → task → model [M7]), skips keys already stored (resume), sends each request through `sendWithRetry` and appends one raw row per request (`executePlan`). Keys are read only from `.env`. `--dry-run`: the fake adapter for every model, rows to `results/dry-run/raw/`. `--limit N`: at most N new requests. Stops after 5 error rows in a row, overall or for one model; Ctrl+C stops after the current request (author's decisions 3.11.2026). Prints one line per row (model version, times, tokens, the start of the answer).

## `src/runner/retry.js`
`sendWithRetry(send, message, options)`: temporary errors (429, 5xx, timeout, dropped connection) get up to 3 retries after 10 s, 30 s and 60 s; the timeout is 10 minutes per attempt, stream included, through an `AbortSignal` [PK1]. Returns the result or the error, the start time of the last attempt, and the earlier failed attempts (`retries`).

## `src/runner/rawRows.js`
`buildRawRow` (the raw row format of CLAUDE.md, incl. `retries` and `usageRaw`), `rawRowKey` (`runId|taskId|modelId|repeat`), `appendRawRow` (append only), `readRawRows`, `existingKeys`.

## Adapters
Every adapter returns `send(message, { signal })` → `{ text, modelVersion, finishReason, usage, usageRaw, ttftMs, totalMs }`. Only the model, one user message and the maximum output length are sent, plus non-generative options that the measurement needs; requests are streamed and timed with `performance.now()`; the SDKs' own retries are off.

| file | role |
|---|---|
| `src/adapters/index.js` | `createAdapter(model, options)`: picks the adapter by `adapter` in `config/models.json` |
| `src/adapters/common.js` | `ApiError` (status, retryable), `toApiError`, `getApiKey` (from `.env` only), the shared result contract |
| `src/adapters/openaiCompatible.js` | OpenAI, xAI, DeepSeek through Chat Completions (`openai` SDK, own `baseURL`); `stream_options.include_usage`; usage normalization incl. `completionIncludesReasoning`; an aborted stream is an error |
| `src/adapters/anthropic.js` | Anthropic Messages API; thinking blocks are not part of the answer; input = input + cache read + cache creation |
| `src/adapters/google.js` | Gemini (`@google/genai`); thoughts are not part of the answer; `automaticContinuation: false`; output = candidates + thoughts |
| `src/adapters/fake.js` | deterministic fake answers for tests and `--dry-run`; no network |

## Shared modules
| file | role |
|---|---|
| `src/taskBank.js` | `loadTaskBank()`, `buildUserMessage(task, bank)`: the user message from the template, in one pass |
| `src/paths.js` | result paths: `rawFile`, `scoredFile`, `costFile`, `judgeDir`, `judgeCheckDir`, `manualCheckFile`; `{ dryRun: true }` uses `results/dry-run/` |
| `src/random.js` | `mulberry32` (seeded PRNG), `shuffle`, `seedFrom` (seed from a number and a text) |
| `src/csv.js` | `csvLine`, `parseCsv`, `parseCsvObjects` (RFC 4180) |
