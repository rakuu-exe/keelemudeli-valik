# Main run report

Written on 7.11.2026 from the stored rows (PLAN.md phase 6). The data is in `results/raw/main.jsonl`, `results/scored/main.jsonl`, `results/cost/main.jsonl`, `results/judge/` and `results/figures/`. The billing check (section 7) is still preliminary.

## 1. The measurement

- Config `config/run.main.json` at the tag `main-run` (commit `475ef94`, 7.11.2026); the prices checked again on the run day, unchanged (U13).
- 5 models × 120 tasks × 5 repeats = **3000 requests**, 3000 different keys, every model 600. The author started the run in their own terminal.
- Time: 6.11.2026 23:25 – 7.11.2026 02:52 UTC (3 h 27 min); sum of the request times 206.6 min.
- **0 error rows.** 2 retries, both xAI, "The model is currently at capacity due to high demand" (`main|K3-037|xai|1`, `main|K1-008|xai|2`); both answered on the second attempt, the failed attempts are in `retries` [PK1].
- **1 truncated answer:** `main|K2-027|google|1`, `finishReason` `MAX_TOKENS`, 15,996 output tokens, of which 15,359 reasoning. The visible text is a chain of thought in English, not JSON (format 0, correctness 0). The other four repeats of the task ended normally. It is a normal answer and counted [PK1].
- 0 empty answers. The model in every response is the one requested (`gpt-6.1-terra`, `claude-sonnet-5-5`, `gemini-3.8-flash`, `deepseek-flash`, `grok-4.7`).
- DeepSeek: every request at the off-peak price (Friday night and Saturday).

## 2. The judge

- 200 anonymous files (8 tasks × 5 models × 5 repeats), 3 separate calls each = **600 scores** in 56.8 min.
- Every answer from `claude-opus-5-5` (Claude Code 2.1.319); 0 invalid answers, 0 missing scores.
- The three scores of a file are the same in all 200 files. Scores: 2 × 579, 1 × 21, 0 × 0, i.e. 7 answers got 1: K3-028 google (2), K3-035 google (4), K3-035 openai (1).
- Judge correctness per model: anthropic, deepseek, xai 1.000; openai 0.988; google 0.925.

## 3. Criteria per model

From `results/figures/criteria.csv`. Cost = mean `costCriterion` per task; latency = median total time; stability = mean standard deviation of the correctness of the repeats (lower is better).

| model | correctness | format | stability | cost (USD) | latency (s) | TTFT (s) | costBilled of the run |
|---|---|---|---|---|---|---|---|
| openai | 0.975 | 0.992 | 0.010 | 0.000545 | 1.51 | 1.22 | $0.3351 |
| anthropic | 0.876 | 0.873 | 0.019 | 0.001587 | 1.53 | 1.12 | $0.9525 |
| google | 0.978 | 0.998 | 0.013 | 0.003320 | 4.91 | 4.70 | $1.9919 |
| deepseek | 0.991 | 1.000 | 0.006 | 0.000250 | 2.09 | 1.99 | $0.1437 |
| xai | 0.992 | 1.000 | 0.008 | 0.005470 | 4.19 | 4.09 | $2.2288 |

`costBilled` of the main run in total $5.652 (the estimate from the pilot run was $5.72); `costCriterion` $6.704 (xAI's hidden input tokens, as in the pilot run).

## 4. Findings

The same as in the pilot run; no new kind of finding.

- **Anthropic K1:** format and correctness 0.660 (pilot run 0.675). Sonnet 5.5 puts the answer in Markdown bold (`**47**`, `**Marti**`) or adds an explanation after it ("Jah.\n\nLause …"). The strict rule stays (the author's pilot decisions F2, F3).
- **Anthropic K2-040**, all 5 repeats: a JSON object, then "Oot, pean nimed nimetavasse käändesse panema. Parandatud vastus:" and a second JSON object (format 0, correctness 0). In the pilot run the same in English.
- No task where every model gets correctness 0 or format 0, and no rule-scored task with mean correctness below 0.5.
- Ceiling effect: four models have correctness 0.975–0.992.

## 5. Decision model

From `results/figures/summary.md`. Exchange rate 1 EUR = 1.1165 USD, the ECB reference rate of 6.11.2026 (U14).

| rank | profile A (quality first) | profile B (cost first) |
|---|---|---|
| 1 | **deepseek 0.978** | **deepseek 0.971** |
| 2 | openai 0.868 | openai 0.900 |
| 3 | xai 0.800 | google 0.531 |
| 4 | google 0.710 | xai 0.468 |
| 5 | anthropic 0.174 | anthropic 0.446 |

- No ties. Both profiles choose DeepSeek, so the difference between the choices is 0.
- Annual cost (10,000 tasks a day): deepseek $914 (€819); openai $1,988; anthropic $5,794; google $12,117; xai $19,966.
- Sensitivity: the winner changes only when the latency weight reaches 0.45 (A) or 0.40 (B) → openai, and when the correctness weight is 1.00 → xai. At format weight 1.00 deepseek and xai tie. Stability and cost never change the winner.
- Categories: K1 and K2 deepseek, K3 openai (both profiles).

## 6. Reproducibility [M13]

- `run_all.py` twice on the same data: 13 byte-identical files.
- Luna (`gpt-6-luna`, 7.11.2026 09:37–09:39 UTC): 45/45 ok, scoring, cost and `run_all.py --run luna` without a change in `src/`, `config/`, `analysis/`, `data/` or `prompts/` after the tag (I32).

## 7. Billing check [PK9], preliminary

Computed `costBilled` of all requests made with the experiment keys (probe requests, pilot run, main run, Luna) against the dashboards of 7.11.2026 11:41 (local time) in `results/billing/2026-11-07/`.

| provider | computed | dashboard | difference | status |
|---|---|---|---|---|
| OpenAI (Terra + Luna) | $0.4117; 766 requests | $0.41; 729 requests | 0.4% | only 8 of the 45 Luna requests had arrived, at 11:41 and still at 11:49 → take again later |
| Anthropic | $1.1448 | $1.14 spend this month | 0.4% | final |
| Google | $2.3681 = €2.1210 at 1.1165 | spend cap €2.12; cost report €1.14 | 0.05% (spend cap) | the cost report lags ("might take longer than 24 hours") → take again on 8.11 or later; the conversion of the euros is not decided yet |
| DeepSeek | $0.1815; 721 requests; 424,570 tokens | $0.18; 721 requests; 424,570 tokens | 0.8% | final; requests and tokens match exactly |
| xAI | $2.6981; 1,331,037 tokens | $2.70; 1,331,037 tokens (usage page, 11:50) | 0.07% | final; every token type matches exactly; "2,882 requests" = requests counted per token type (721 + 719 + 721 + 721) |

The Anthropic figure also shows that the judge (Claude Code on the Pro subscription) is not in the API bill.

## 8. Still open

- Dashboards again: OpenAI (766 requests) and the Google spend page, on 8.11 or later; the date range from 3.11 or earlier.
- How the Google euros are converted (suggested: the computed USD at the same ECB rate of 6.11.2026).
- The author's check in `analysis/wsm_check.xlsx` [M12].
- Human evaluation [M14]: sample of 60, the Google Form, two raters, kappa.
- The usability table [E2]. Now: condition 1 holds (the process completed, a choice for both profiles); condition 2 (a), (c), (d) hold, (b) waits for the Excel check; conditions 3 and 4 wait for the kappa and the final billing check.
- Before the repository becomes public (phase 9): the screenshots show the author's name and e-mail, so crop them.
