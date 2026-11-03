"""Unit tests of the analysis with hand-calculated examples [M12].

    .venv/Scripts/python -m unittest discover -s analysis/tests -t analysis
"""
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from criteria import criteria_table  # noqa: E402
from decision import annual_cost, minmax, ranking, reweight, sensitivity, switch_points, weight_grid, winner, wsm  # noqa: E402

PROFILE_A = {"correctness": 0.40, "format": 0.25, "stability": 0.15, "cost": 0.10, "latency": 0.10}


def rows(model, task, correctness, *, fmt=1, cost=0.001, total=1000.0, ttft=100.0, finish="stop", status="ok"):
    return [{"key": f"r|{task}|{model}|{i + 1}", "modelId": model, "taskId": task, "repeat": i + 1,
             "status": status, "finishReason": finish, "ttftMs": ttft, "totalMs": total, "category": int(task[1]),
             "scoringMethod": "rules", "format": fmt, "correctness": c, "costCriterion": cost}
            for i, c in enumerate(correctness)]


class MinMax(unittest.TestCase):
    def test_benefit_and_cost_criteria(self):
        t = pd.DataFrame({"correctness": [0.5, 1.0, 0.75], "cost": [10.0, 20.0, 15.0]}, index=["a", "b", "c"])
        n = minmax(t, ["correctness", "cost"])
        # correctness: (x - min) / (max - min) = 0, 1, 0.5; cost: (max - x) / (max - min) = 1, 0, 0.5
        self.assertEqual(list(n["correctness"]), [0.0, 1.0, 0.5])
        self.assertEqual(list(n["cost"]), [1.0, 0.0, 0.5])

    def test_all_equal_gives_one(self):
        t = pd.DataFrame({"stability": [0.0, 0.0, 0.0], "format": [0.9, 0.9, 0.9]}, index=["a", "b", "c"])
        n = minmax(t, ["stability", "format"])
        self.assertEqual(list(n["stability"]), [1.0, 1.0, 1.0])
        self.assertEqual(list(n["format"]), [1.0, 1.0, 1.0])


class WSM(unittest.TestCase):
    def test_weighted_sum(self):
        n = pd.DataFrame({"correctness": [1.0, 0.0, 0.5], "cost": [0.0, 1.0, 0.5]}, index=["a", "b", "c"])
        s = wsm(n, {"correctness": 0.6, "cost": 0.4})
        # a = 0.6, b = 0.4, c = 0.6 × 0.5 + 0.4 × 0.5 = 0.5
        np.testing.assert_allclose(s.to_numpy(), [0.6, 0.4, 0.5])
        self.assertEqual(list(ranking(s)), [1, 3, 2])
        self.assertEqual(winner(s), ("a", ["a"]))

    def test_tie_keeps_the_table_order_and_is_reported(self):
        s = pd.Series([0.5, 0.7, 0.7], index=["a", "b", "c"])
        self.assertEqual(winner(s), ("b", ["b", "c"]))
        self.assertEqual(list(ranking(s)), [3, 1, 2])


class Weights(unittest.TestCase):
    def test_reweight_keeps_the_sum_and_the_proportions(self):
        w = reweight(PROFILE_A, "correctness", 0.6)
        self.assertAlmostEqual(sum(w.values()), 1.0)
        self.assertAlmostEqual(w["correctness"], 0.6)
        # format: 0.25 × (1 − 0.6) / (1 − 0.4) = 0.25 × 0.4 / 0.6 = 0.1666…
        self.assertAlmostEqual(w["format"], 0.25 * 0.4 / 0.6)
        # the others keep their ratio: format / cost = 0.25 / 0.10
        self.assertAlmostEqual(w["format"] / w["cost"], 2.5)

    def test_reweight_ends(self):
        self.assertEqual(reweight(PROFILE_A, "cost", 1.0)["correctness"], 0.0)
        w0 = reweight(PROFILE_A, "cost", 0.0)
        self.assertAlmostEqual(w0["correctness"], 0.40 / 0.90)

    def test_grid_0_to_1_in_steps_of_0_05(self):
        g = weight_grid(0.05)
        self.assertEqual(len(g), 21)
        self.assertEqual((g[0], g[1], g[-1]), (0.0, 0.05, 1.0))


class Sensitivity(unittest.TestCase):
    def test_winner_changes_where_the_lines_cross(self):
        # a is best in correctness, b in cost; with weights {correctness w, cost 1 − w}:
        # score a = w, score b = 1 − w → they cross at w = 0.5, a wins above it.
        n = pd.DataFrame({"correctness": [1.0, 0.0], "cost": [0.0, 1.0]}, index=["a", "b"])
        weights = {"correctness": 0.7, "cost": 0.3}
        sens = sensitivity(n, weights, 0.05)
        sw = switch_points(sens, weights, "a").set_index("criterion")
        self.assertEqual(sw.loc["correctness", "changes"], "0.55: b -> a")
        self.assertEqual(sw.loc["correctness", "ties"], "0.50 (a,b)")
        self.assertEqual((sw.loc["correctness", "winner_holds_from"], sw.loc["correctness", "winner_holds_to"]), (0.5, 1.0))
        # varying cost: a = 1 − w, b = w → a holds up to and including the tie at 0.5
        self.assertEqual((sw.loc["cost", "winner_holds_from"], sw.loc["cost", "winner_holds_to"]), (0.0, 0.5))

    def test_a_tie_with_the_previous_winner_is_not_a_change(self):
        n = pd.DataFrame({"correctness": [1.0, 1.0], "cost": [1.0, 0.0]}, index=["a", "b"])
        weights = {"correctness": 0.5, "cost": 0.5}
        sw = switch_points(sensitivity(n, weights, 0.05), weights, "a").set_index("criterion")
        # at correctness weight 1.0 a and b tie; a stays the winner
        self.assertEqual(sw.loc["correctness", "changes"], "none")
        self.assertEqual(sw.loc["correctness", "ties"], "1.00 (a,b)")


class Criteria(unittest.TestCase):
    def test_hand_calculated_criteria(self):
        df = pd.DataFrame(
            rows("m", "K1-001", [1, 1, 1, 1, 0], total=1000.0)
            + rows("m", "K1-002", [1, 1, 1, 1, 1], total=3000.0, cost=0.003)
            + rows("m", "K3-001", [None], fmt=0, finish="max_tokens")
            + rows("m", "K1-003", [None], status="error"))
        df.loc[df["status"] == "error", ["format", "correctness", "costCriterion", "totalMs", "ttftMs", "finishReason"]] = None
        t = criteria_table(df, ["m"]).loc["m"]
        # answers: 11 ok rows; correctness over the 10 with a value: 9 / 10
        self.assertEqual(t["answers"], 11)
        self.assertAlmostEqual(t["correctness"], 0.9)
        self.assertEqual(t["correctness_missing"], 1)
        # format: 10 of 11
        self.assertAlmostEqual(t["format"], 10 / 11)
        # stability: K1-001 [1,1,1,1,0]: mean 0.8, population sd sqrt(0.16) = 0.4; K1-002: 0;
        # K3-001 has no correctness → not counted; mean (0.4 + 0) / 2 = 0.2
        self.assertAlmostEqual(t["stability"], 0.2)
        # cost: (5 × 0.001 + 5 × 0.003 + 0.001) / 11
        self.assertAlmostEqual(t["cost"], (5 * 0.001 + 5 * 0.003 + 0.001) / 11)
        # latency: median of 5 × 1000, 5 × 3000, 1 × 1000 → 1000
        self.assertEqual(t["latency"], 1000.0)
        self.assertEqual((t["errors"], t["truncated"]), (1, 1))


class AnnualCost(unittest.TestCase):
    def test_per_task_times_volume_times_days(self):
        s = annual_cost(pd.Series({"a": 0.001, "b": 0.0005}), 10000, 365)
        # 0.001 × 10,000 × 365 = 3,650 USD
        self.assertAlmostEqual(s["a"], 3650.0)
        self.assertAlmostEqual(s["b"], 1825.0)


if __name__ == "__main__":
    unittest.main()
