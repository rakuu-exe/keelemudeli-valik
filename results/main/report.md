# Main run report

Written on 7.11.2026 from the stored rows (PLAN.md phase 6). The data is in `results/raw/main.jsonl`, `results/scored/main.jsonl`, `results/cost/main.jsonl`, `results/judge/` and `results/figures/`. The billing check (section 7) is final since 10.11.2026; the result of the human evaluation (section 8) and the usability table (section 9) were added on 15.11.2026.

## 1. The measurement

- Config `config/run.main.json` at the tag `main-run` (commit `095d7b2`, 7.11.2026); the prices checked again on the run day, unchanged (U13).
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

## 7. Billing check [PK9]

Computed `costBilled` of all requests made with the experiment keys (probe requests, pilot run, main run, Luna) against the dashboards: Anthropic, DeepSeek and xAI of 7.11.2026 (`results/billing/2026-11-07/`), OpenAI and Google of 10.11.2026 (`results/billing/2026-11-10/`; on 7.11 their data had not all arrived). Google bills in euros: the computed USD sum is converted at the same ECB rate as the annual cost, 1 EUR = 1.1165 USD of 6.11.2026 (author's decision 7.11.2026).

| provider | computed | dashboard | difference | status |
|---|---|---|---|---|
| OpenAI (Terra + Luna) | $0.4117; 766 requests; 110,800 input tokens | $0.41; 766 requests; 110,800 input tokens (10.11, 22:59) | 0.4% | final; requests and input tokens match exactly (on 7.11 only 729 requests had arrived) |
| Anthropic | $1.1448 | $1.14 spend this month | 0.4% | final |
| Google | $2.3681 = €2.1210 at 1.1165 | cost report €2.13 (14.10–10.11); spend cap €2.12 (10.11, 22:59) | 0.4% (cost report); 0.05% (spend cap) | final; the cost report (the billed cost) is the dashboard value; on 7.11 it still showed €1.14 |
| DeepSeek | $0.1815; 721 requests; 424,570 tokens | $0.18; 721 requests; 424,570 tokens | 0.8% | final; requests and tokens match exactly |
| xAI | $2.6981; 1,331,037 tokens | $2.70; 1,331,037 tokens (usage page, 11:50) | 0.07% | final; every token type matches exactly; "2,882 requests" = requests counted per token type (721 + 719 + 721 + 721) |

The Anthropic figure also shows that the judge (Claude Code on the Pro subscription) is not in the API bill.

Every difference, rounded to one decimal, is below 5.0%: the largest is DeepSeek's 0.8% (the dashboard shows two decimals of a sum of $0.18), so condition 4 of the usability criterion holds.

## 8. Human evaluation [M14]

**Before the raters scored** (written on 10.11.2026, unchanged): the automatic scores of the sample are 57 × 2, 1 × 1 and 2 × 0, and all three below 2 are borderline cases where the rule is stricter than a reading of the content: A16 (`main|K2-028|openai|1`, `"klient A"` where the reference is `"A"`, the only top-level field: correctness 0 → 0), A24 (`main|K2-020|google|5`, `null` for the VAT amount and the total, which the text does not state but which can be computed: correctness 1/3 → 1), A34 (`main|K1-025|anthropic|4`, `**05.00**` with an explanation: correctness 0 → 0). Because of the ceiling effect the kappa depends almost only on these three: if a rater agrees with every other score, the linearly weighted kappa is 1.00 when the rater also gives 1, 0, 0 to them (A24, A16, A34), 0.88 with 2, 0, 0, 0.74 with 1, 2, 0 or 1, 0, 2, 0.56 with 2, 2, 0, 0.32 with 1, 2, 2 and 0.00 with 2, 2, 2 (the kappa paradox: high agreement, low kappa). The rater guide (author's decision 10.11.2026, made knowing these automatic scores but before any rater saw the form): a short answer asked for in a given form is correct only in that form, so by the guide A34 is 0, as in the automatic scoring; the guide says nothing specific about A16 and A24, where the raters judge the content.

**The result** (added on 15.11.2026). Two raters scored the 60 answers of the sample in the Google Form on 15.11.2026, without model names: `results/human/form_responses.csv` → `scores_rater1.csv`, `scores_rater2.csv` (`src/human/import.js`) → `kappa.csv` (`analysis/human_eval.py`).

| scores | 0 | 1 | 2 |
|---|---|---|---|
| automatic | 2 | 1 | 57 |
| rater 1 | 1 | 3 | 56 |
| rater 2 | 2 | 7 | 51 |

Linearly weighted Cohen's kappa:

| pair | all answers (n = 60) | judge-scored answers (n = 10), descriptive |
|---|---|---|
| rater 1 – automatic | 0.37 | not defined (both sides gave 2 to all ten) |
| rater 2 – automatic | 0.20 | 0.00 |
| rater 1 – rater 2 | 0.32 | 0.00 |

The 12 answers where a rater's score differs from the automatic score (rater 1 in 5, rater 2 in 10; the other 48 got the same score from all three):

| answer | raw row | automatic | rater 1 | rater 2 | rater 1's comment |
|---|---|---|---|---|---|
| A02 | `main\|K3-036\|google\|2` | 2 | 2 | 1 | |
| A04 | `main\|K3-028\|google\|2` (judge) | 2 | 2 | 1 | |
| A14 | `main\|K1-040\|google\|5` | 2 | 2 | 0 | |
| A16 | `main\|K2-028\|openai\|1` | 0 | 2 | 2 | |
| A17 | `main\|K3-013\|openai\|5` | 2 | 2 | 1 | |
| A24 | `main\|K2-020\|google\|5` | 1 | 2 | 2 | |
| A30 | `main\|K3-019\|xai\|2` | 2 | 2 | 1 | |
| A32 | `main\|K2-030\|google\|5` | 2 | 1 | 2 | "Tekstist ei tule kuskilt välja mis on vastuolu väärtus" |
| A37 | `main\|K2-025\|google\|3` | 2 | 2 | 1 | |
| A43 | `main\|K3-010\|google\|4` | 2 | 1 | 1 | "Peaks olema Soome ettevõtte tehnoloogia juht. Sisu muutub vastavalt sellele" |
| A44 | `main\|K2-030\|xai\|1` | 2 | 1 | 2 | "Vastuolu ei tule kuskilt tekstist välja." |
| A59 | `main\|K3-026\|xai\|5` (judge) | 2 | 2 | 1 | |

Rater 2 wrote no comments. The fourth comment of rater 1 is on A34 ("Ei vastanud nõutud kujul."), where all three scores are 0.

Of the three borderline cases above, A34 got 0 from both raters, as in the automatic scoring and as the rater guide says; A16 and A24 got 2 from both raters, against the automatic 0 and 1. That is the case "2, 2, 0" above: 0.56 if every other score were the same. The raters also differ from the automatic score on other answers, all with the automatic score 2: rater 1 on 3 (A32, A43, A44), rater 2 on 8 (A02, A04, A14, A17, A30, A37, A43, A59).

## 9. The usability table [E2]

The criterion was fixed before the main run (`docs/usability_criterion.md`, author's decision 6.11.2026): the methodology is usable if all four conditions hold.

| # | condition | result | holds |
|---|---|---|---|
| 1 | The process was carried out from start to end and a model was chosen for both usage profiles. | 3000 requests measured (0 error rows), scored (rules and judge) and costed; profile A and profile B both choose deepseek (sections 1–5). | yes |
| 2 | The calculations are correct and reproducible. | (a) The unit tests pass (`npm test`, `analysis/tests`). (b) `analysis/wsm_check.xlsx`: every model "OK", largest difference 1.7e-10 against the tolerance 1e-6, the same ranks as `wsm.csv` (10.11.2026). (c) `run_all.py` twice: 13 byte-identical files. (d) Luna: 45/45 ok, scoring, cost and analysis without code changes (section 6). | yes |
| 3 | The automatic scoring agrees with human evaluation. | Kappa rater 1 – automatic 0.37, rater 2 – automatic 0.20; the limit is ≥ 0.61 for both (section 8). Rater 1 – rater 2 0.32 (reported, not part of the condition). | **no** |
| 4 | The computed cost matches the provider's billing. | The largest difference is 0.8% (DeepSeek); the limit is < 5.0% for every provider (section 7). | yes |

Conditions 1, 2 and 4 hold, condition 3 does not. By the criterion the usability of the methodology is therefore not shown in full: the agreement of the automatic scoring with the human raters is below the limit. As the criterion says, the thesis has not failed; the discussion chapter says what did not work and why (written by the author).

## 10. Still open

- The public GitHub repository (PLAN.md phase 9). The account identity in the billing screenshots is covered (U23).
