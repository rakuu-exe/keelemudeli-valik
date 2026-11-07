# Analysis (`analysis/`, Python)

All tables and figures of phase 7 from the stored rows; no API or judge calls. The rules are in CLAUDE.md, "Analysis (phase 7, Python)".

```
python -m venv .venv
.venv/Scripts/pip install -r analysis/requirements.txt
.venv/Scripts/python analysis/run_all.py                 # the main run → results/figures/
.venv/Scripts/python analysis/run_all.py --run pilot     # a preview → results/figures/pilot/
.venv/Scripts/python analysis/run_all.py --dry-run --run main   # under results/dry-run/
```

## `analysis/run_all.py`
Runs everything and writes the outputs (see [results](results.md)): `criteria.csv`, `criteria_by_category.csv`, `normalized.csv`, `wsm.csv`, `annual_cost.csv`, `annual_cost_choices.csv`, `sensitivity.csv`, `sensitivity_switches.csv`, `categories.csv`, `wsm_check_input.csv`, `sensitivity_A.png`, `sensitivity_B.png`, `summary.md`. CSV with a decimal point and LF; the same data gives byte-identical files [M13]. Any run other than `main` is marked "preview only" in its summary. `wsm_check_input.csv` starts with the columns of `analysis/wsm_check.xlsx` (correctness, format, cost, latency_s, stability, score_A, score_B), then the normalized values.

## `analysis/common.py`
`load_run(run_id, dry_run)`: one row per raw row with its score and cost (joined by key; error if an ok row has no score or cost row); `load_profiles`, `load_settings`, `model_order` (the order of `config/models.json`), `CRITERIA`, `BENEFIT`, `TRUNCATED`.

## `analysis/criteria.py`
`criteria_table(df, models)`: per model answers, errors, truncated, correctness (mean), format (mean), stability (per task the population SD of the correctness of the answered repeats, mean over tasks), cost (mean costCriterion), latency (median totalMs), ttft (median), and the counts of missing values [M2–M6, PK1]. `criteria_by_category` [M11].

## `analysis/decision.py`
`minmax` [M8] (benefit / cost criteria; max = min → 1), `wsm` [M9], `ranking` and `winner` (ties keep the model order and are reported), `reweight` and `weight_grid` (one weight 0…1 by 0.05, the others in proportion) [M10], `sensitivity`, `switch_points` (changes, ties, the range where the original winner holds), `annual_cost` [PK7].

## `analysis/figures.py`
`sensitivity_figure`: one figure per profile, five small multiples (one per criterion), one line per model, a dashed line at the profile's weight. Colours: the dataviz reference palette in its fixed order by the model's position in `config/models.json`, plus one marker shape per model; PNG without the software version in its metadata.

## `analysis/settings.json`
`usdPerEur` (1 EUR = `usdPerEur` USD; 1.1165, the ECB reference rate of 6.11.2026, the main run day [M4]; 7.11 is a Saturday without a rate; `null` = EUR columns empty), `rateDate`, `rateSource`, `sensitivityStep` (0.05).

## `analysis/wsm_check.xlsx`
The author's independent check of the calculation [M12], made on 1.11.2026 (in Estonian; formerly `wsm_kontroll.xlsx`). Sheet "Sisend": the yellow cells take each model's five criterion values (correctness, format, cost $ per task, latency s, stability) and the Python scores A and B; sheet "Arvutus" computes min-max and the WSM with Excel formulas and compares them with Python (tolerance 0.000001, "Kõik klapivad" when everything matches). A sixth row is for the Luna test [M13]. Copy the values from `wsm_check_input.csv`, whose first columns are in the same order and units. It holds sample data until the main run.

## `analysis/requirements.txt`
Pinned versions: pandas, numpy, scikit-learn (Cohen's kappa in phase 8), matplotlib.
