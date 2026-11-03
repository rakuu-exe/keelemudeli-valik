# Cost (`src/cost/`)

## `src/cost/cost.js`
```
node src/cost/cost.js --run <runId> [--dry-run]
```
Two sums in USD for every ok raw row, from its stored usage and `config/pricing.json` [M4] → `results/cost/<runId>.jsonl` (`key`, `costCriterion`, `costBilled`; derived, written again every time).

- `costCriterion` = all input × input price + all output (reasoning included) × output price, as if every request were new → the WSM.
- `costBilled` = (input − cached − written to cache) × input price + cached × cache price + written × cache write price + output × output price → the billing check [PK9]. Cache writes (`cacheWrites`): Anthropic `cache_creation_input_tokens` split by TTL, OpenAI `prompt_tokens_details.cache_write_tokens`.
- DeepSeek: peak or off-peak by `tsStartUtc` (`isPeak`; Mon–Fri 01:00–04:00 and 06:00–10:00 UTC, start included, end excluded; `offPeakDates` off-peak all day), in both sums.
- A price that does not apply is an error: a date after `validUntil`, a prompt above `maxInputTokens`, a non-standard service tier or speed, regional inference.
- Error rows get no cost row; an ok row without usage gets `null`.

Exports: `loadPricing`, `computeCost`, `costRawRows`, `isPeak`, `pricesFor`, `cacheWrites`. Checked on the probe of 3.11.2026: xAI's own `cost_in_usd_ticks` equals `costBilled`.
