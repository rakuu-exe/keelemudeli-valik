"""Loading the stored data and the settings for the analysis (PLAN.md phase 7).

The analysis only reads stored rows (measure once, compute many times):
results/raw/<runId>.jsonl, results/scored/<runId>.jsonl and results/cost/<runId>.jsonl.
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CRITERIA = ["correctness", "format", "stability", "cost", "latency"]
# Higher is better for these; for cost, latency and stability (spread) lower is better [M8].
BENEFIT = {"correctness", "format"}
TRUNCATED = {"length", "max_tokens", "MAX_TOKENS"}


def results_dir(dry_run=False):
    return ROOT / "results" / "dry-run" if dry_run else ROOT / "results"


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def model_order():
    """Model ids in the order of config/models.json (a fixed order for every table)."""
    return [m["id"] for m in read_json(ROOT / "config" / "models.json")["models"]]


def load_profiles():
    return read_json(ROOT / "config" / "profiles.json")


def load_settings():
    return read_json(ROOT / "analysis" / "settings.json")


def load_run(run_id, dry_run=False):
    """One row per raw row: the raw fields, the score and the cost, joined by key.

    Error rows keep empty score and cost fields. Every ok row must have a score row and a cost
    row; otherwise scoring or the cost calculation has not been run for this run.
    """
    base = results_dir(dry_run)
    raw = pd.DataFrame(read_jsonl(base / "raw" / f"{run_id}.jsonl"))
    raw = raw[["key", "modelId", "taskId", "repeat", "status", "finishReason", "ttftMs", "totalMs"]]
    raw["category"] = raw["taskId"].str.slice(1, 2).astype(int)
    scored = pd.DataFrame(read_jsonl(base / "scored" / f"{run_id}.jsonl"))[
        ["key", "scoringMethod", "format", "correctness"]]
    cost = pd.DataFrame(read_jsonl(base / "cost" / f"{run_id}.jsonl"))[["key", "costCriterion"]]
    df = raw.merge(scored, on="key", how="left", validate="one_to_one")
    df = df.merge(cost, on="key", how="left", validate="one_to_one")
    ok = df["status"] == "ok"
    missing = df[ok & (df["format"].isna() | df["key"].isin(set(df["key"]) - set(cost["key"])))]
    if len(missing):
        raise ValueError(f"{len(missing)} ok rows have no score or cost row (first: {missing['key'].iloc[0]}); "
                         f"run src/checkers/score.js and src/cost/cost.js for {run_id}")
    return df
