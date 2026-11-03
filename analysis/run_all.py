"""All tables and figures of the analysis with one command (PLAN.md phase 7).

    python analysis/run_all.py                 the main run → results/figures/
    python analysis/run_all.py --run pilot     another run  → results/figures/pilot/
    python analysis/run_all.py --dry-run ...   the same under results/dry-run/

Reads the stored rows only (raw, scored, cost); no API or judge calls. The same data gives the
same files, byte for byte [M13].

Outputs (CSV: comma separated, decimal point, LF):
  criteria.csv              criteria per model, plus errors and truncated answers   [M2–M6, PK1]
  criteria_by_category.csv  the same per category                                   [M11]
  normalized.csv            min-max values                                          [M8]
  wsm.csv                   aggregate score and rank per profile and model          [M9]
  annual_cost.csv           annual cost per profile and model, difference from the chosen model [PK7]
  annual_cost_choices.csv   the choices of the two profiles and their difference    [PK7]
  sensitivity.csv           the scores at every weight value                        [M10]
  sensitivity_switches.csv  where the winner changes, per profile and criterion     [M10]
  categories.csv            the winner and ranking per category and profile         [M11]
  wsm_check_input.csv       input for the manual check in wsm_check.xlsx            [M12]
  sensitivity_<profile>.png one figure per profile                                  [M10]
  summary.md                the main tables for reading
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import CRITERIA, load_profiles, load_run, load_settings, model_order, results_dir  # noqa: E402
from criteria import criteria_by_category, criteria_table  # noqa: E402
from decision import annual_cost, minmax, ranking, sensitivity, switch_points, winner, wsm  # noqa: E402
from figures import model_style, sensitivity_figure  # noqa: E402

FLOAT = "%.10g"


def write_csv(df, path, index=True):
    df.to_csv(path, index=index, float_format=FLOAT, lineterminator="\n", encoding="utf-8")


def md_table(df, formats=None, index=True):
    """A Markdown table; formats: column → format string or function."""
    formats = formats or {}
    d = df.reset_index() if index else df
    cols = list(d.columns)

    def cell(col, v):
        if isinstance(v, float) and np.isnan(v):
            return "-"
        f = formats.get(col)
        if f is None:
            return str(v)
        return f(v) if callable(f) else format(v, f)

    lines = ["| " + " | ".join(map(str, cols)) + " |", "|" + "---|" * len(cols)]
    lines += ["| " + " | ".join(cell(c, r[c]) for c in cols) + " |" for _, r in d.iterrows()]
    return "\n".join(lines)


def analyse(run_id, dry_run=False, out_dir=None):
    profiles = load_profiles()
    settings = load_settings()
    all_models = model_order()
    df = load_run(run_id, dry_run)
    models = [m for m in all_models if m in set(df["modelId"])]
    style = model_style(all_models)
    if out_dir is None:
        base = results_dir(dry_run) / "figures"
        out_dir = base if run_id == "main" and not dry_run else base / run_id
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # --- Criteria and min-max ---
    crit = criteria_table(df, models)
    write_csv(crit, out / "criteria.csv")
    by_cat = criteria_by_category(df, models)
    write_csv(pd.concat({k: v for k, v in by_cat.items()}, names=["category", "model"]), out / "criteria_by_category.csv")
    norm = minmax(crit)
    write_csv(norm, out / "normalized.csv")

    # --- WSM per profile ---
    rate = settings.get("usdPerEur")
    wsm_rows, annual_rows, choices, switch_rows, sens_frames = [], [], {}, [], []
    check = crit[CRITERIA].join(norm.add_prefix("norm_"))
    for pid, p in profiles["profiles"].items():
        w = p["weights"]
        scores = wsm(norm, w)
        ranks = ranking(scores)
        best, tied = winner(scores)
        choices[pid] = best
        check[f"score_{pid}"] = scores
        for m in models:
            wsm_rows.append({"profile": pid, "model": m, "score": float(scores[m]), "rank": int(ranks[m]),
                             "chosen": m == best, "tie": m in tied and len(tied) > 1})
        # annual cost [PK7]
        yearly = annual_cost(crit["cost"], profiles["dailyVolume"], profiles["daysPerYear"])
        for m in models:
            annual_rows.append({
                "profile": pid, "model": m, "annual_usd": float(yearly[m]),
                "difference_from_chosen_usd": float(yearly[m] - yearly[best]),
                "annual_eur": float(yearly[m] / rate) if rate else np.nan,
                "difference_from_chosen_eur": float((yearly[m] - yearly[best]) / rate) if rate else np.nan,
                "chosen": m == best,
            })
        # sensitivity [M10]
        sens = sensitivity(norm, w, settings["sensitivityStep"])
        sens.insert(0, "profile", pid)
        sens_frames.append(sens)
        sw = switch_points(sens, w, best)
        sw.insert(0, "profile", pid)
        switch_rows.append(sw)
        sensitivity_figure(sens, w, models, style, f"Sensitivity analysis, profile {pid} ({p['name']})",
                           out / f"sensitivity_{pid}.png")

    wsm_df = pd.DataFrame(wsm_rows)
    write_csv(wsm_df, out / "wsm.csv", index=False)
    annual_df = pd.DataFrame(annual_rows)
    write_csv(annual_df, out / "annual_cost.csv", index=False)
    yearly = annual_cost(crit["cost"], profiles["dailyVolume"], profiles["daysPerYear"])
    pa, pb = list(profiles["profiles"])[:2]
    choice_df = pd.DataFrame([{
        "profile_1": pa, "choice_1": choices[pa], "annual_usd_1": float(yearly[choices[pa]]),
        "profile_2": pb, "choice_2": choices[pb], "annual_usd_2": float(yearly[choices[pb]]),
        "difference_usd": float(yearly[choices[pa]] - yearly[choices[pb]]),
        "difference_eur": float((yearly[choices[pa]] - yearly[choices[pb]]) / rate) if rate else np.nan,
    }])
    write_csv(choice_df, out / "annual_cost_choices.csv", index=False)
    switches = pd.concat(switch_rows, ignore_index=True)
    write_csv(switches, out / "sensitivity_switches.csv", index=False)
    write_csv(pd.concat(sens_frames, ignore_index=True), out / "sensitivity.csv", index=False)

    # --- Categories [M11]: criteria and min-max within the category, the same weights ---
    cat_rows = []
    overall_rank = {pid: list(wsm_df[wsm_df.profile == pid].sort_values("rank")["model"]) for pid in profiles["profiles"]}
    for k, t in by_cat.items():
        n = minmax(t)
        for pid, p in profiles["profiles"].items():
            s = wsm(n, p["weights"])
            r = ranking(s)
            order = list(r.sort_values().index)
            best, tied = winner(s)
            cat_rows.append({"category": f"K{k}", "profile": pid, "winner": best, "tie": len(tied) > 1,
                             "ranking": " > ".join(order), "same_as_overall": order == overall_rank[pid]})
    cat_df = pd.DataFrame(cat_rows)
    write_csv(cat_df, out / "categories.csv", index=False)

    # --- Manual check input [M12] ---
    # The columns in the order of the "Sisend" sheet of analysis/wsm_check.xlsx (correctness, format,
    # cost, latency in seconds, stability; then the Python scores), the normalized values after them.
    check["latency_s"] = check["latency"] / 1000
    first = ["correctness", "format", "cost", "latency_s", "stability", *[f"score_{p}" for p in profiles["profiles"]]]
    write_csv(check[first + [f"norm_{c}" for c in CRITERIA]], out / "wsm_check_input.csv")

    # --- Summary ---
    f3, f6 = ".3f", ".6f"
    crit_view = crit.copy()
    crit_view["latency_s"] = crit_view["latency"] / 1000
    crit_view["ttft_s"] = crit_view["ttft"] / 1000
    crit_view = crit_view[["answers", "errors", "truncated", "correctness", "format", "stability", "cost", "latency_s", "ttft_s"]]
    fmt_crit = {"correctness": f3, "format": f3, "stability": f3, "cost": f6, "latency_s": ".2f", "ttft_s": ".2f"}
    preview = run_id != "main" or dry_run
    lines = [f"# Analysis: {run_id}{' (dry run, fake data)' if dry_run else ''}", ""]
    if preview:
        lines += ["**Preview only: this is not the main comparison.** The main comparison is the run `main`; "
                  "pilot run data is not used in it (PLAN.md phase 5).", ""]
        if run_id == "pilot":
            lines += ["With one repeat, stability is 0 for every model, so it does not separate them here.", ""]
    lines += [f"Profiles: {', '.join(f'{k} ({v['name']})' for k, v in profiles['profiles'].items())}. "
             f"Annual cost: {profiles['dailyVolume']:,} tasks a day × {profiles['daysPerYear']} days, costCriterion, USD"
             + (f"; EUR at {rate} USD per EUR ({settings.get('rateDate')}, {settings.get('rateSource')})." if rate else "; EUR: no exchange rate set yet (analysis/settings.json)."),
             "", "## Criteria per model", "",
             "cost = mean costCriterion per task (USD); latency = median total time; ttft = median time to first token (additional only); stability = mean standard deviation of the correctness of the repeats (lower is better).",
             "", md_table(crit_view, fmt_crit), "", "## Min-max normalized", "",
             md_table(norm, {c: f3 for c in CRITERIA}), ""]
    for pid, p in profiles["profiles"].items():
        part = wsm_df[wsm_df.profile == pid].sort_values("rank")[["rank", "model", "score", "tie"]]
        lines += [f"## Profile {pid}: {p['name']}", "",
                  "Weights: " + ", ".join(f"{c} {w:.2f}" for c, w in p["weights"].items()) + f". **Chosen: {choices[pid]}**",
                  "", md_table(part, {"score": f3}, index=False), "",
                  md_table(annual_df[annual_df.profile == pid][["model", "annual_usd", "difference_from_chosen_usd", "annual_eur"]],
                           {"annual_usd": ",.0f", "difference_from_chosen_usd": "+,.0f", "annual_eur": ",.0f"}, index=False), "",
                  "Sensitivity (where the winner changes):", "",
                  md_table(switches[switches.profile == pid][["criterion", "weight", "changes", "ties", "winner_holds_from", "winner_holds_to"]],
                           {"weight": ".2f", "winner_holds_from": ".2f", "winner_holds_to": ".2f"}, index=False), ""]
    c = choice_df.iloc[0]
    lines += ["## The choices of the two profiles", "",
              f"{c.profile_1}: {c.choice_1} ({c.annual_usd_1:,.0f} USD a year); {c.profile_2}: {c.choice_2} ({c.annual_usd_2:,.0f} USD a year); "
              f"difference {c.difference_usd:+,.0f} USD a year.", "",
              "## Categories", "", md_table(cat_df, index=False), ""]
    (out / "summary.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # the Windows console default (cp1252) lacks some characters
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--run", default="main")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    out = analyse(args.run, args.dry_run)
    print(f"Tables and figures → {out}")


if __name__ == "__main__":
    main()
