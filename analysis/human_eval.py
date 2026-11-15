"""Agreement of the human evaluation (PLAN.md phase 8.4, [M14]).

    .venv/Scripts/python analysis/human_eval.py

Reads results/human/key.csv, scores_rater1.csv, scores_rater2.csv and results/scored/main.jsonl
(the automatic scores); writes results/human/kappa.csv (comma separated, decimal point, LF) and
prints it.

The automatic correctness on the 0/1/2 scale: a rule-scored answer 0 → 0, between 0 and 1 → 1,
1 → 2; a judge-scored answer the judge median directly (correctness × 2).
Linearly weighted Cohen's kappa (sklearn cohen_kappa_score, weights="linear", labels 0, 1, 2) for
r1–r2, r1–auto and r2–auto: for all answers, and descriptively for the judge-scored answers alone.
Kappa is empty when it is not defined (all scores of both sides are the same single value).
"""
import math
import sys
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import read_jsonl, results_dir  # noqa: E402

LABELS = [0, 1, 2]
PAIRS = [("r1", "r2"), ("r1", "auto"), ("r2", "auto")]
TOLERANCE = 1e-12


def auto_score(correctness, method):
    """The automatic correctness (0…1) of one answer on the raters' 0/1/2 scale."""
    if correctness is None or (isinstance(correctness, float) and math.isnan(correctness)):
        raise ValueError("no automatic correctness")
    if method == "judge":
        score = round(correctness * 2)
        if abs(score - correctness * 2) > TOLERANCE:
            raise ValueError(f"judge correctness {correctness} is not a median of 0/1/2")
        return score
    if method == "rules":
        if abs(correctness) <= TOLERANCE:
            return 0
        if abs(correctness - 1) <= TOLERANCE:
            return 2
        return 1
    raise ValueError(f"unknown scoring method {method}")


def linear_kappa(a, b):
    """Linearly weighted Cohen's kappa; NaN when it is not defined."""
    a, b = list(a), list(b)
    if len(set(a) | set(b)) < 2:
        return float("nan")
    return float(cohen_kappa_score(a, b, labels=LABELS, weights="linear"))


def scores_table(key, rater1, rater2, scored):
    """One row per answerId: scoringMethod, r1, r2, auto."""
    by_key = {r["key"]: r for r in scored}
    rows = []
    for k in key.itertuples(index=False):
        row = by_key.get(k.key)
        if row is None:
            raise ValueError(f"{k.answerId}: no score row for {k.key}")
        if row["scoringMethod"] != k.scoringMethod:
            raise ValueError(f"{k.answerId}: scoring method {row['scoringMethod']} in the score row, {k.scoringMethod} in key.csv")
        rows.append({"answerId": k.answerId, "scoringMethod": k.scoringMethod,
                     "auto": auto_score(row["correctness"], k.scoringMethod)})
    table = pd.DataFrame(rows).set_index("answerId")
    for name, rater in (("r1", rater1), ("r2", rater2)):
        scores = rater.set_index("answerId")["score"]
        if set(scores.index) != set(table.index) or len(scores) != len(table):
            raise ValueError(f"{name}: the answer IDs do not match key.csv")
        if not scores.isin(LABELS).all():
            raise ValueError(f"{name}: a score other than 0, 1 or 2")
        table[name] = scores.astype(int)
    return table.sort_index()


def kappa_table(table):
    """subset, pair, n, kappa."""
    out = []
    for subset, part in (("all", table), ("judge", table[table["scoringMethod"] == "judge"])):
        for x, y in PAIRS:
            out.append({"subset": subset, "pair": f"{x}-{y}", "n": len(part), "kappa": linear_kappa(part[x], part[y])})
    return pd.DataFrame(out)


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # the Windows console default (cp1252) lacks some characters
    human = results_dir() / "human"
    key = pd.read_csv(human / "key.csv", dtype=str, keep_default_na=False)
    rater1 = pd.read_csv(human / "scores_rater1.csv", dtype={"answerId": str}, keep_default_na=False)
    rater2 = pd.read_csv(human / "scores_rater2.csv", dtype={"answerId": str}, keep_default_na=False)
    scored = read_jsonl(results_dir() / "scored" / "main.jsonl")
    kappas = kappa_table(scores_table(key, rater1, rater2, scored))
    out = human / "kappa.csv"
    kappas.to_csv(out, index=False, lineterminator="\n")
    print(kappas.to_string(index=False))
    print(f"→ {out}")


if __name__ == "__main__":
    main()
