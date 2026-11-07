# Analysis: pilot

**Preview only: this is not the main comparison.** The main comparison is the run `main`; pilot run data is not used in it (PLAN.md phase 5).

With one repeat, stability is 0 for every model, so it does not separate them here.

Profiles: A (quality first), B (cost first). Annual cost: 10,000 tasks a day × 365 days, costCriterion, USD; EUR at 1.1165 USD per EUR (2026-11-06, the ECB euro reference rate of 6.11.2026 (1 EUR = 1.1165 USD), https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml; the main run ran 6.11.2026 23:25 - 7.11.2026 02:52 UTC, and 7.11.2026 is a Saturday without a reference rate).

## Criteria per model

cost = mean costCriterion per task (USD); latency = median total time; ttft = median time to first token (additional only); stability = mean standard deviation of the correctness of the repeats (lower is better).

| model | answers | errors | truncated | correctness | format | stability | cost | latency_s | ttft_s |
|---|---|---|---|---|---|---|---|---|---|
| openai | 120 | 0 | 0 | 0.971 | 0.983 | 0.000 | 0.000595 | 1.66 | 1.36 |
| anthropic | 120 | 0 | 0 | 0.883 | 0.875 | 0.000 | 0.001600 | 1.87 | 1.44 |
| google | 120 | 0 | 0 | 0.969 | 0.992 | 0.000 | 0.003119 | 5.27 | 5.10 |
| deepseek | 120 | 0 | 0 | 0.983 | 0.992 | 0.000 | 0.000314 | 2.05 | 1.98 |
| xai | 120 | 0 | 0 | 0.982 | 0.992 | 0.000 | 0.005636 | 3.55 | 3.42 |

## Min-max normalized

| model | correctness | format | stability | cost | latency |
|---|---|---|---|---|---|
| openai | 0.875 | 0.929 | 1.000 | 0.947 | 1.000 |
| anthropic | 0.000 | 0.000 | 1.000 | 0.758 | 0.942 |
| google | 0.861 | 1.000 | 1.000 | 0.473 | 0.000 |
| deepseek | 1.000 | 1.000 | 1.000 | 1.000 | 0.891 |
| xai | 0.986 | 1.000 | 1.000 | 0.000 | 0.475 |

## Profile A: quality first

Weights: correctness 0.40, format 0.25, stability 0.15, cost 0.10, latency 0.10. **Chosen: deepseek**

| rank | model | score | tie |
|---|---|---|---|
| 1 | deepseek | 0.989 | False |
| 2 | openai | 0.927 | False |
| 3 | xai | 0.842 | False |
| 4 | google | 0.792 | False |
| 5 | anthropic | 0.320 | False |

| model | annual_usd | difference_from_chosen_usd | annual_eur |
|---|---|---|---|
| openai | 2,173 | +1,028 | 1,946 |
| anthropic | 5,841 | +4,696 | 5,231 |
| google | 11,383 | +10,238 | 10,195 |
| deepseek | 1,145 | +0 | 1,025 |
| xai | 20,573 | +19,428 | 18,426 |

Sensitivity (where the winner changes):

| criterion | weight | changes | ties | winner_holds_from | winner_holds_to |
|---|---|---|---|---|---|
| correctness | 0.40 | none | none | 0.00 | 1.00 |
| format | 0.25 | none | 1.00 (google,deepseek,xai) | 0.00 | 1.00 |
| stability | 0.15 | none | 1.00 (openai,anthropic,google,deepseek,xai) | 0.00 | 1.00 |
| cost | 0.10 | none | none | 0.00 | 1.00 |
| latency | 0.10 | 0.45: deepseek -> openai | none | 0.00 | 0.40 |

## Profile B: cost first

Weights: correctness 0.25, format 0.10, stability 0.10, cost 0.40, latency 0.15. **Chosen: deepseek**

| rank | model | score | tie |
|---|---|---|---|
| 1 | deepseek | 0.984 | False |
| 2 | openai | 0.940 | False |
| 3 | google | 0.604 | False |
| 4 | anthropic | 0.545 | False |
| 5 | xai | 0.518 | False |

| model | annual_usd | difference_from_chosen_usd | annual_eur |
|---|---|---|---|
| openai | 2,173 | +1,028 | 1,946 |
| anthropic | 5,841 | +4,696 | 5,231 |
| google | 11,383 | +10,238 | 10,195 |
| deepseek | 1,145 | +0 | 1,025 |
| xai | 20,573 | +19,428 | 18,426 |

Sensitivity (where the winner changes):

| criterion | weight | changes | ties | winner_holds_from | winner_holds_to |
|---|---|---|---|---|---|
| correctness | 0.25 | none | none | 0.00 | 1.00 |
| format | 0.10 | none | 1.00 (google,deepseek,xai) | 0.00 | 1.00 |
| stability | 0.10 | none | 1.00 (openai,anthropic,google,deepseek,xai) | 0.00 | 1.00 |
| cost | 0.40 | none | none | 0.00 | 1.00 |
| latency | 0.15 | 0.40: deepseek -> openai | none | 0.00 | 0.35 |

## The choices of the two profiles

A: deepseek (1,145 USD a year); B: deepseek (1,145 USD a year); difference +0 USD a year.

## Categories

| category | profile | winner | tie | ranking | same_as_overall |
|---|---|---|---|---|---|
| K1 | A | deepseek | False | deepseek > openai > google > xai > anthropic | False |
| K1 | B | deepseek | False | deepseek > openai > google > anthropic > xai | True |
| K2 | A | deepseek | False | deepseek > openai > xai > anthropic > google | False |
| K2 | B | deepseek | False | deepseek > openai > anthropic > xai > google | False |
| K3 | A | openai | False | openai > xai > anthropic > deepseek > google | False |
| K3 | B | openai | False | openai > anthropic > deepseek > xai > google | False |
