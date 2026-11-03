"""The five criteria per model (PLAN.md phase 7) and the counts of errors and truncated answers.

  correctness  mean correctness of the scored answers                       [M2]
  format       mean format compliance (0/1)                                 [M3]
  cost         mean costCriterion per task (USD)                            [M4]
  latency      median totalMs; ttft (median ttftMs) is additional only      [M5]
  stability    for every task the population standard deviation (ddof=0) of the
               correctness of its repeats, then the mean over the tasks     [M6]

Error rows are not answers: they count only in `errors` [PK1]. A task whose repeat is an error
row gets its standard deviation from the repeats that were answered.
"""
import numpy as np
import pandas as pd

from common import TRUNCATED


def _stability(ok):
    per_task = ok.groupby(["modelId", "taskId"])["correctness"].agg(
        lambda s: float(np.std(s.dropna().to_numpy(), ddof=0)) if s.notna().any() else np.nan)
    return per_task.groupby("modelId").mean()


def criteria_table(df, models):
    """Criteria per model, in the order of `models`."""
    ok = df[df["status"] == "ok"]
    g = ok.groupby("modelId")
    table = pd.DataFrame({
        "answers": g.size(),
        "correctness": g["correctness"].mean(),
        "format": g["format"].mean(),
        "stability": _stability(ok),
        "cost": g["costCriterion"].mean(),
        "latency": g["totalMs"].median(),
        "ttft": g["ttftMs"].median(),
        "correctness_missing": g["correctness"].apply(lambda s: int(s.isna().sum())),
        "cost_missing": g["costCriterion"].apply(lambda s: int(s.isna().sum())),
        "truncated": g["finishReason"].apply(lambda s: int(s.isin(TRUNCATED).sum())),
    })
    table["errors"] = df[df["status"] == "error"].groupby("modelId").size()
    table = table.reindex([m for m in models if m in set(df["modelId"])])
    for col in ["answers", "errors", "truncated", "correctness_missing", "cost_missing"]:
        table[col] = table[col].fillna(0).astype(int)
    table.index.name = "model"
    return table


def criteria_by_category(df, models):
    """Criteria per category and model: {category: table}."""
    return {int(c): criteria_table(part, models) for c, part in df.groupby("category")}
