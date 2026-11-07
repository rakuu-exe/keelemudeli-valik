# Analysis: luna

**Preview only: this is not the main comparison.** The main comparison is the run `main`; pilot run data is not used in it (PLAN.md phase 5).

Profiles: A (quality first), B (cost first). Annual cost: 10,000 tasks a day × 365 days, costCriterion, USD; EUR at 1.1216 USD per EUR (2026-11-03, the author's figure of 3.11.2026 (1 EUR = 1.1216 USD, 1 USD = 0.8916 EUR); to be replaced by the ECB reference rate of the main run day).

## Criteria per model

cost = mean costCriterion per task (USD); latency = median total time; ttft = median time to first token (additional only); stability = mean standard deviation of the correctness of the repeats (lower is better).

| model | answers | errors | truncated | correctness | format | stability | cost | latency_s | ttft_s |
|---|---|---|---|---|---|---|---|---|---|
| luna | 45 | 0 | 0 | 0.981 | 1.000 | 0.028 | 0.000076 | 1.46 | 1.21 |

## Min-max normalized

| model | correctness | format | stability | cost | latency |
|---|---|---|---|---|---|
| luna | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |

## Profile A: quality first

Weights: correctness 0.40, format 0.25, stability 0.15, cost 0.10, latency 0.10. **Chosen: luna**

| rank | model | score | tie |
|---|---|---|---|
| 1 | luna | 1.000 | False |

| model | annual_usd | difference_from_chosen_usd | annual_eur |
|---|---|---|---|
| luna | 277 | +0 | 247 |

Sensitivity (where the winner changes):

| criterion | weight | changes | ties | winner_holds_from | winner_holds_to |
|---|---|---|---|---|---|
| correctness | 0.40 | none | none | 0.00 | 1.00 |
| format | 0.25 | none | none | 0.00 | 1.00 |
| stability | 0.15 | none | none | 0.00 | 1.00 |
| cost | 0.10 | none | none | 0.00 | 1.00 |
| latency | 0.10 | none | none | 0.00 | 1.00 |

## Profile B: cost first

Weights: correctness 0.25, format 0.10, stability 0.10, cost 0.40, latency 0.15. **Chosen: luna**

| rank | model | score | tie |
|---|---|---|---|
| 1 | luna | 1.000 | False |

| model | annual_usd | difference_from_chosen_usd | annual_eur |
|---|---|---|---|
| luna | 277 | +0 | 247 |

Sensitivity (where the winner changes):

| criterion | weight | changes | ties | winner_holds_from | winner_holds_to |
|---|---|---|---|---|---|
| correctness | 0.25 | none | none | 0.00 | 1.00 |
| format | 0.10 | none | none | 0.00 | 1.00 |
| stability | 0.10 | none | none | 0.00 | 1.00 |
| cost | 0.40 | none | none | 0.00 | 1.00 |
| latency | 0.15 | none | none | 0.00 | 1.00 |

## The choices of the two profiles

A: luna (277 USD a year); B: luna (277 USD a year); difference +0 USD a year.

## Categories

| category | profile | winner | tie | ranking | same_as_overall |
|---|---|---|---|---|---|
| K1 | A | luna | False | luna | True |
| K1 | B | luna | False | luna | True |
| K2 | A | luna | False | luna | True |
| K2 | B | luna | False | luna | True |
| K3 | A | luna | False | luna | True |
| K3 | B | luna | False | luna | True |
