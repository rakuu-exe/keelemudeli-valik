"""Unit tests of the human evaluation agreement with hand-calculated examples [M12, M14].

    .venv/Scripts/python -m unittest discover -s analysis/tests
"""
import math
import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from human_eval import auto_score, kappa_table, linear_kappa, scores_table  # noqa: E402


class AutoScore(unittest.TestCase):
    def test_rules(self):
        self.assertEqual([auto_score(c, "rules") for c in (0, 0.25, 0.5, 0.75, 1)], [0, 1, 1, 1, 2])

    def test_judge_median_directly(self):
        self.assertEqual([auto_score(c, "judge") for c in (0, 0.5, 1)], [0, 1, 2])
        with self.assertRaises(ValueError):
            auto_score(0.75, "judge")

    def test_missing(self):
        with self.assertRaises(ValueError):
            auto_score(None, "judge")


class LinearKappa(unittest.TestCase):
    def test_hand_calculated(self):
        # r1 = 0,1,2,2; r2 = 0,2,2,1. Disagreement weights |i-j|/2.
        # Observed: (0 + 0.5 + 0 + 0.5) / 4 = 0.25. Margins of both: 1/4, 1/4, 2/4.
        # Expected: 1/4·(1/4·0.5 + 2/4·1) + 1/4·(1/4·0.5 + 2/4·0.5) + 2/4·(1/4·1 + 1/4·0.5) = 0.4375.
        # Kappa = 1 − 0.25 / 0.4375 = 3/7.
        self.assertAlmostEqual(linear_kappa([0, 1, 2, 2], [0, 2, 2, 1]), 3 / 7, places=12)

    def test_full_agreement(self):
        self.assertAlmostEqual(linear_kappa([0, 1, 2], [0, 1, 2]), 1.0, places=12)

    def test_not_defined_when_everything_is_one_value(self):
        self.assertTrue(math.isnan(linear_kappa([2, 2, 2], [2, 2, 2])))


class Tables(unittest.TestCase):
    def setUp(self):
        self.key = pd.DataFrame({"answerId": ["A01", "A02", "A03", "A04"],
                                 "key": ["main|K1|a|1", "main|K2|a|1", "main|K3|b|1", "main|K3|b|2"],
                                 "scoringMethod": ["rules", "rules", "judge", "judge"]})
        self.scored = [
            {"key": "main|K1|a|1", "scoringMethod": "rules", "correctness": 0},
            {"key": "main|K2|a|1", "scoringMethod": "rules", "correctness": 0.5},
            {"key": "main|K3|b|1", "scoringMethod": "judge", "correctness": 1},
            {"key": "main|K3|b|2", "scoringMethod": "judge", "correctness": 1},
        ]
        self.r1 = pd.DataFrame({"answerId": ["A01", "A02", "A03", "A04"], "score": [0, 1, 2, 2], "comment": ""})
        self.r2 = pd.DataFrame({"answerId": ["A04", "A03", "A02", "A01"], "score": [1, 2, 2, 0], "comment": ""})

    def test_scores_table(self):
        t = scores_table(self.key, self.r1, self.r2, self.scored)
        self.assertEqual(t["auto"].tolist(), [0, 1, 2, 2])
        self.assertEqual(t["r1"].tolist(), [0, 1, 2, 2])
        self.assertEqual(t["r2"].tolist(), [0, 2, 2, 1])

    def test_kappa_table(self):
        k = kappa_table(scores_table(self.key, self.r1, self.r2, self.scored)).set_index(["subset", "pair"])
        self.assertAlmostEqual(k.loc[("all", "r1-r2"), "kappa"], 3 / 7, places=12)
        self.assertAlmostEqual(k.loc[("all", "r1-auto"), "kappa"], 1.0, places=12)
        # judge subset: r1 = 2,2 and auto = 2,2 → not defined
        self.assertEqual(k.loc[("judge", "r1-auto"), "n"], 2)
        self.assertTrue(math.isnan(k.loc[("judge", "r1-auto"), "kappa"]))

    def test_mismatched_ids(self):
        with self.assertRaises(ValueError):
            scores_table(self.key, self.r1.iloc[:3], self.r2, self.scored)


if __name__ == "__main__":
    unittest.main()
