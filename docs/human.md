# Human evaluation (`src/human/`, `tools/apps_script/`, `analysis/human_eval.py`)

PLAN.md phase 8.4 [M14]: two raters score 60 answers of the main run on the scale 0/1/2, without model names; the agreement with the automatic scoring is linearly weighted Cohen's kappa. Condition 3 of the usability criterion ([usability_criterion.md](usability_criterion.md)) uses rater 1 – automatic and rater 2 – automatic.

## Steps

```
node src/human/sample.js                      # 1. the sample → results/human/sample.csv, key.csv (once)
#  2. the author: sample.csv and rater_guide.txt to Google Drive, create_form.gs in script.google.com → the form
#  3. the raters answer; the author downloads the responses (.csv) from the form
node src/human/import.js --file <responses.csv>   # 4. → results/human/scores_rater1.csv, scores_rater2.csv
.venv/Scripts/python analysis/human_eval.py      # 5. → results/human/kappa.csv
```

## Files

| file | what it does |
|---|---|
| `src/human/sample.js` | draws the sample with a fixed seed (20261107): for every category and model 4 answers to different tasks, each with a random repeat; in K3 2 to rule-scored tasks and 2 to judge tasks; 60 in all. The 60 are shuffled and numbered A01…A60 in that order. `sample.csv` has `answerId`, `sourceText`, `task` (the user message after the source text, i.e. the instruction, for K2 with the schema: exactly what the model saw) and `answer` (the raw answer, unchanged); `key.csv` has `answerId`, `key`, `scoringMethod`. The files are never overwritten. |
| `src/human/import.js` | turns the form's responses (.csv) into one file per rater (`answerId`, `score`, `comment`), by the question titles: `Hindaja` (1 or 2), the answer ID (the score is the first digit of the choice, "2 – õige" → 2) and `<ID> kommentaar`. Exactly one response per rater; two responses of one rater are an error (the author decides which counts). The score files are never overwritten. |
| `tools/apps_script/create_form.gs` | the Google Apps Script that creates the Google Form from `sample.csv`: the rater guide as the form description, the question `Hindaja`, then every answer on its own page in the order of `sample.csv` (already shuffled): a required question with the ID as the title, the source text, the task and the answer in the description and the choices "0 – vale", "1 – osaliselt õige", "2 – õige", and an optional comment. The form's own shuffle is not used, because it would separate a comment from its answer. It reads the two files from the author's Google Drive and checks the header of `sample.csv`. |
| `tools/apps_script/rater_guide.txt` | the rater guide in Estonian (the raters are Estonian): the scale 0/1/2, what to consider and three examples with all three scores; the examples are not tasks of the task bank. |
| `analysis/human_eval.py` | the automatic correctness on the 0/1/2 scale (rule-scored: 0 → 0, between → 1, 1 → 2; judge-scored: the judge median directly) and the linearly weighted kappa (`sklearn cohen_kappa_score(weights="linear")`, labels 0, 1, 2) for r1–r2, r1–auto and r2–auto, for all answers and descriptively for the judge-scored answers alone; `kappa.csv` has `subset`, `pair`, `n`, `kappa` (empty when not defined: all scores of both sides the same value). |

The texts of the form and the guide are in Estonian; the code and these docs are in English (CLAUDE.md, "Language").
