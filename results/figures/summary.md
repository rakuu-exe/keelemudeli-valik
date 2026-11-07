# Analysis: main

Profiles: A (quality first), B (cost first). Annual cost: 10,000 tasks a day × 365 days, costCriterion, USD; EUR at 1.1165 USD per EUR (2026-11-06, the ECB euro reference rate of 6.11.2026 (1 EUR = 1.1165 USD), https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml; the main run ran 6.11.2026 23:25 - 7.11.2026 02:52 UTC, and 7.11.2026 is a Saturday without a reference rate).

## Criteria per model

cost = mean costCriterion per task (USD); latency = median total time; ttft = median time to first token (additional only); stability = mean standard deviation of the correctness of the repeats (lower is better).

| model | answers | errors | truncated | correctness | format | stability | cost | latency_s | ttft_s |
|---|---|---|---|---|---|---|---|---|---|
| openai | 600 | 0 | 0 | 0.975 | 0.992 | 0.010 | 0.000545 | 1.51 | 1.22 |
| anthropic | 600 | 0 | 0 | 0.876 | 0.873 | 0.019 | 0.001587 | 1.53 | 1.12 |
| google | 600 | 0 | 1 | 0.978 | 0.998 | 0.013 | 0.003320 | 4.91 | 4.70 |
| deepseek | 600 | 0 | 0 | 0.991 | 1.000 | 0.006 | 0.000250 | 2.09 | 1.99 |
| xai | 600 | 0 | 0 | 0.992 | 1.000 | 0.008 | 0.005470 | 4.19 | 4.09 |

## Min-max normalized

| model | correctness | format | stability | cost | latency |
|---|---|---|---|---|---|
| openai | 0.850 | 0.934 | 0.668 | 0.944 | 1.000 |
| anthropic | 0.000 | 0.000 | 0.000 | 0.744 | 0.993 |
| google | 0.877 | 0.987 | 0.477 | 0.412 | 0.000 |
| deepseek | 0.988 | 1.000 | 1.000 | 1.000 | 0.827 |
| xai | 1.000 | 1.000 | 0.856 | 0.000 | 0.212 |

## Profile A: quality first

Weights: correctness 0.40, format 0.25, stability 0.15, cost 0.10, latency 0.10. **Chosen: deepseek**

| rank | model | score | tie |
|---|---|---|---|
| 1 | deepseek | 0.978 | False |
| 2 | openai | 0.868 | False |
| 3 | xai | 0.800 | False |
| 4 | google | 0.710 | False |
| 5 | anthropic | 0.174 | False |

| model | annual_usd | difference_from_chosen_usd | annual_eur |
|---|---|---|---|
| openai | 1,988 | +1,074 | 1,781 |
| anthropic | 5,794 | +4,880 | 5,190 |
| google | 12,117 | +11,203 | 10,853 |
| deepseek | 914 | +0 | 819 |
| xai | 19,966 | +19,052 | 17,883 |

Sensitivity (where the winner changes):

| criterion | weight | changes | ties | winner_holds_from | winner_holds_to |
|---|---|---|---|---|---|
| correctness | 0.40 | 1.00: deepseek -> xai | none | 0.00 | 0.95 |
| format | 0.25 | none | 1.00 (deepseek,xai) | 0.00 | 1.00 |
| stability | 0.15 | none | none | 0.00 | 1.00 |
| cost | 0.10 | none | none | 0.00 | 1.00 |
| latency | 0.10 | 0.45: deepseek -> openai | none | 0.00 | 0.40 |

## Profile B: cost first

Weights: correctness 0.25, format 0.10, stability 0.10, cost 0.40, latency 0.15. **Chosen: deepseek**

| rank | model | score | tie |
|---|---|---|---|
| 1 | deepseek | 0.971 | False |
| 2 | openai | 0.900 | False |
| 3 | google | 0.531 | False |
| 4 | xai | 0.468 | False |
| 5 | anthropic | 0.446 | False |

| model | annual_usd | difference_from_chosen_usd | annual_eur |
|---|---|---|---|
| openai | 1,988 | +1,074 | 1,781 |
| anthropic | 5,794 | +4,880 | 5,190 |
| google | 12,117 | +11,203 | 10,853 |
| deepseek | 914 | +0 | 819 |
| xai | 19,966 | +19,052 | 17,883 |

Sensitivity (where the winner changes):

| criterion | weight | changes | ties | winner_holds_from | winner_holds_to |
|---|---|---|---|---|---|
| correctness | 0.25 | 1.00: deepseek -> xai | none | 0.00 | 0.95 |
| format | 0.10 | none | 1.00 (deepseek,xai) | 0.00 | 1.00 |
| stability | 0.10 | none | none | 0.00 | 1.00 |
| cost | 0.40 | none | none | 0.00 | 1.00 |
| latency | 0.15 | 0.40: deepseek -> openai | none | 0.00 | 0.35 |

## The choices of the two profiles

A: deepseek (914 USD a year); B: deepseek (914 USD a year); difference +0 USD a year.

## Categories

| category | profile | winner | tie | ranking | same_as_overall |
|---|---|---|---|---|---|
| K1 | A | deepseek | False | deepseek > openai > google > xai > anthropic | False |
| K1 | B | deepseek | False | deepseek > openai > google > xai > anthropic | True |
| K2 | A | deepseek | False | deepseek > xai > anthropic > openai > google | False |
| K2 | B | deepseek | False | deepseek > anthropic > openai > xai > google | False |
| K3 | A | openai | False | openai > xai > anthropic > deepseek > google | False |
| K3 | B | openai | False | openai > anthropic > deepseek > xai > google | False |
