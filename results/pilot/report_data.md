# Pilot run data: pilot

Generated from the stored rows (600 raw rows).

## Per model

| model | answers | errors | retries | truncated | empty | format | correctness | costBilled | costCriterion/request | median total | median TTFT | mean output tokens | mean reasoning |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openai | 120 | 0 | 0 | 0 | 0 | 0.983 | 0.971 | $0.0731 | $0.000595 | 1.7 s | 1.4 s | 90 | 57 |
| anthropic | 120 | 0 | 0 | 0 | 0 | 0.875 | 0.883 | $0.1920 | $0.001600 | 1.9 s | 1.4 s | 111 | 58 |
| google | 120 | 0 | 0 | 0 | 0 | 0.992 | 0.969 | $0.3742 | $0.003119 | 5.3 s | 5.1 s | 800 | 769 |
| deepseek | 120 | 0 | 0 | 0 | 0 | 0.992 | 0.983 | $0.0376 | $0.000314 | 2.1 s | 2.0 s | 471 | 441 |
| xai | 120 | 0 | 0 | 0 | 0 | 0.992 | 0.982 | $0.4665 | $0.005636 | 3.6 s | 3.4 s | 474 | 446 |

## Errors and truncated answers

None.

## Time and cost

- Wall-clock time from the first request to the end of the last: 43.9 min (includes pauses between runs).
- Sum of request times: 43.7 min.
- costBilled in total: $1.1435; costCriterion in total: $1.3517.
- Estimate for the main run (×5): about $5.7174 and 218.4 min of request time.

| model | costBilled pilot | estimate main run |
|---|---|---|
| openai | $0.0731 | $0.3654 |
| anthropic | $0.1920 | $0.9601 |
| google | $0.3742 | $1.8712 |
| deepseek | $0.0376 | $0.1882 |
| xai | $0.4665 | $2.3325 |

## Suspicious tasks

### All models correctness 0 (rule-scored)

- **K1-011** (Kas klient sai paki isiklikult kätte? Vasta: jah / ei / ei selgu)
  - openai: format 0, correctness 0.00, answer "ei selgu"
  - anthropic: format 0, correctness 0.00, answer "**Ei selgu.**\n\nTekstist selgub, et klient ei olnud kodus ja pakk viidi…"
  - google: format 0, correctness 0.00, answer "ei selgu"
  - deepseek: format 0, correctness 0.00, answer "ei selgu"
  - xai: format 0, correctness 0.00, answer "ei selgu"

### All models format 0

- **K1-011** (Kas klient sai paki isiklikult kätte? Vasta: jah / ei / ei selgu)
  - openai: format 0, correctness 0.00, answer "ei selgu"
  - anthropic: format 0, correctness 0.00, answer "**Ei selgu.**\n\nTekstist selgub, et klient ei olnud kodus ja pakk viidi…"
  - google: format 0, correctness 0.00, answer "ei selgu"
  - deepseek: format 0, correctness 0.00, answer "ei selgu"
  - xai: format 0, correctness 0.00, answer "ei selgu"

### Mean correctness below 0.5 across the models (rule-scored, not listed above)

None.

### K1: correct after removing Markdown marks (*, _, `), but scored 0

- pilot|K1-002|anthropic|1: "**47**"

### K2: format 0

- pilot|K2-040|anthropic|1: correctness 0.00, starts "{\"kohtumised\":[{\"isik\":\"Kaial\",\"kuupäev\"…"

## Judge

- Files: 40; scores: 120; missing (null): 0; invalid attempts: 0.
- Models in the answers: claude-opus-5-5; Claude Code: 2.1.317 (Claude Code).
- Files whose 3 scores are not all the same: 0 of 40.
- Score distribution: 0: 0, 1: 3, 2: 117.
