# Usability criterion [E2]

**Fixed before the main run** (author's decision 6.11.2026; committed before the git tag `main-run`, so the criterion cannot be adjusted to the results). The thesis states it in Estonian in the methodology chapter; this file is the English record.

Goal E2 of the thesis: "… ja näidata selle kasutatavust, rakendades seda viie eri pakkuja keelemudeli võrdlemisel eestikeelsetel ülesannetel …".

**The methodology is usable if all four conditions hold.** If a condition does not hold, the thesis has not failed: the discussion chapter says what did not work and why.

| # | condition | how it is checked | holds when | decisions |
|---|---|---|---|---|
| 1 | The process was carried out from start to end and a model was chosen for both usage profiles. | The main run (5 models × 120 tasks × 5 repeats) is measured, scored (rules and judge) and costed, and `analysis/run_all.py` gives the ranking and the chosen model for profiles A and B. | Both profiles have a chosen model. | PLAN.md phases 6–7 |
| 2 | The calculations are correct and reproducible. | (a) The unit tests with hand-calculated examples pass (`npm test`, `analysis/tests`). (b) The author's independent check of one profile in `analysis/wsm_check.xlsx` matches the Python results. (c) `run_all.py` twice on the same stored data gives byte-identical output files. (d) The sixth model `gpt-6-luna`, which exists only as a row in `config/models.json`, passes the measurement pipeline, scoring, cost and analysis (`config/run.luna.json`) without code changes. | (a)–(d) all hold. | M12, M13 |
| 3 | The automatic scoring agrees with human evaluation. | 60 answers of the main run (3 categories × 5 models × 4), two raters, correctness on the scale 0/1/2, without model names. Linearly weighted Cohen's kappa rater 1 – automatic and rater 2 – automatic. Rater 1 – rater 2 is reported but is not part of the condition. | Both kappas, rounded to two decimals, ≥ 0.61 (Landis & Koch 1977: substantial agreement). | M14, K12 |
| 4 | The computed cost matches the provider's billing. | Per provider: the sum of `costBilled` of all requests made with the experiment key (probe requests, pilot run, main run, Luna) against the provider's dashboard (a dated screenshot). Difference = \|computed − dashboard\| / dashboard × 100%. The judge (Pro subscription) is not part of it. | The difference, rounded to one decimal, is < 5.0% for every provider separately. | PK9, M4 |

Author's decisions 6.11.2026:

- The Excel check (2b) is part of condition 2, because it is the only check that does not depend on the Python code (PLAN.md phase 8, items 1–2).
- The 5% limit holds for every provider separately, because PK9 compares per provider. With small sums the dashboard's rounding matters more (e.g. DeepSeek, about $0.25 in total, shown with two decimals: up to about 2%).
- A value at the threshold is compared as it is reported in the thesis (kappa with two decimals, the cost difference with one decimal), so that a reader can check it from the table. E.g. a kappa of 0.6095 is reported as 0.61 and passes; a difference of 4.96% is reported as 5.0% and fails.

The results of every condition are reported in one table in the thesis (PLAN.md phase 8, item 5).
