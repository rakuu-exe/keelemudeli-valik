"""The decision model (PLAN.md phase 7): min-max normalization, the weighted sum model, the annual
cost and the sensitivity analysis.

  min-max [M8]      correctness, format: (x - min) / (max - min); cost, latency, stability:
                    (max - x) / (max - min); if max = min, every model gets 1.
  WSM [M9]          aggregate score = sum of weight x normalized value; the weights sum to 1.
  annual cost [PK7] mean costCriterion x daily volume x 365.
  sensitivity [M10] one weight at a time from 0 to 1 in steps of 0.05; the other weights change
                    in proportion, so that the sum stays 1.
"""
import numpy as np
import pandas as pd

from common import BENEFIT, CRITERIA

EQUAL_TOLERANCE = 1e-12


def minmax(table, criteria=CRITERIA):
    """Normalized values 0...1 per criterion; 1 is the best model."""
    out = pd.DataFrame(index=table.index)
    for c in criteria:
        x = table[c].astype(float)
        lo, hi = x.min(), x.max()
        if hi - lo <= EQUAL_TOLERANCE:
            out[c] = 1.0
        elif c in BENEFIT:
            out[c] = (x - lo) / (hi - lo)
        else:
            out[c] = (hi - x) / (hi - lo)
    return out


def wsm(normalized, weights):
    """Aggregate score per model."""
    return sum(normalized[c] * w for c, w in weights.items())


def ranking(scores):
    """Rank 1 is the best. Ties keep the model order of the table; they are reported by is_tie."""
    order = sorted(scores.index, key=lambda m: (-round(float(scores[m]), 12), list(scores.index).index(m)))
    ranks = pd.Series(range(1, len(order) + 1), index=order, name="rank")
    return ranks.reindex(scores.index)


def winner(scores):
    """(chosen model, tied models): the chosen one is rank 1; tied = all models with the same top score."""
    ranks = ranking(scores)
    best = ranks.idxmin()
    tied = [m for m in scores.index if abs(float(scores[m]) - float(scores[best])) <= EQUAL_TOLERANCE]
    return best, tied


def reweight(weights, criterion, value):
    """Weights with `criterion` set to `value`; the others scaled in proportion so the sum stays 1."""
    rest = 1.0 - weights[criterion]
    if rest <= EQUAL_TOLERANCE:
        raise ValueError(f"{criterion} already has the whole weight")
    return {c: (value if c == criterion else w * (1.0 - value) / rest) for c, w in weights.items()}


def weight_grid(step):
    n = int(round(1 / step))
    return [round(i * step, 10) for i in range(n + 1)]


def sensitivity(normalized, weights, step):
    """Long table: one row per criterion and weight value, with the scores and the winner."""
    rows = []
    for c in weights:
        for value in weight_grid(step):
            w = reweight(weights, c, value)
            scores = wsm(normalized, w)
            best, tied = winner(scores)
            row = {"criterion": c, "weight": value, "winner": best, "tied": ",".join(tied) if len(tied) > 1 else ""}
            row.update({f"score_{m}": float(scores[m]) for m in normalized.index})
            rows.append(row)
    return pd.DataFrame(rows)


def _effective_winners(part):
    """The winner at every grid value, where a tie that includes the previous winner keeps it
    (a tie is not a change of the winner)."""
    eff = []
    for _, r in part.iterrows():
        tied = set(r["tied"].split(",")) if r["tied"] else {r["winner"]}
        eff.append(eff[-1] if eff and eff[-1] in tied else r["winner"])
    return eff


def switch_points(sens, weights, base_winner):
    """Per criterion: the weights at which the winner changes (compared with the previous grid
    value), the weights with a tie at the top, and the contiguous range of grid weights around
    the original weight where the original winner still wins (a tie with it counts as holding)."""
    out = []
    for c in weights:
        part = sens[sens["criterion"] == c].sort_values("weight").reset_index(drop=True)
        eff = _effective_winners(part)
        changes = [f"{part.loc[i, 'weight']:.2f}: {eff[i - 1]} -> {eff[i]}"
                   for i in range(1, len(part)) if eff[i] != eff[i - 1]]
        ties = [f"{r['weight']:.2f} ({r['tied']})" for _, r in part.iterrows() if r["tied"]]
        # the original winner holds where it is first or shares the first place
        holds_at = [base_winner == r["winner"] or base_winner in r["tied"].split(",") for _, r in part.iterrows()]
        at = int((part["weight"] - weights[c]).abs().idxmin())
        lo = hi = at
        if holds_at[at]:
            while lo > 0 and holds_at[lo - 1]:
                lo -= 1
            while hi < len(part) - 1 and holds_at[hi + 1]:
                hi += 1
            holds = (float(part.loc[lo, "weight"]), float(part.loc[hi, "weight"]))
        else:
            holds = (np.nan, np.nan)
        out.append({
            "criterion": c,
            "weight": weights[c],
            "winner": base_winner,
            "changes": "; ".join(changes) if changes else "none",
            "ties": "; ".join(ties) if ties else "none",
            "winner_holds_from": holds[0],
            "winner_holds_to": holds[1],
        })
    return pd.DataFrame(out)


def annual_cost(cost_per_task, daily_volume, days):
    """USD per year per model."""
    return cost_per_task * daily_volume * days
