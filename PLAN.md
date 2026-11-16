# PLAN.md

Work plan for building the software part of the thesis. It is based on the signed thesis proposal and the author's decisions in `kavandi_tooplaan.xlsx` (tags in brackets, e.g. [M2], refer to the rows of that file). Do one phase at a time. At the end of each phase the author reviews the result, and only then does work continue.

**Deadlines:** thesis for pre-defence 30.11, pre-defence 7.–11.12, final version 5.01.

---

## Confirmed choices (summary)

| Topic | Decision |
|---|---|
| Models [L1] | `gpt-6.1-terra`, `claude-sonnet-5-5`, `gemini-3.8-flash`, `deepseek-flash`, `grok-4.7` |
| Request [L2, L3] | one user message from the template, no system prompt, the only parameter is max output 16,000, no tools |
| Repeats [M7] | 5; measured in rounds (repeat 1 for everyone, then repeat 2, etc.) |
| Pilot run [L5] | 5 × 120 × 1 = 600 requests |
| Main run [PK4] | 5 × 120 × 5 = 3000 requests |
| Judge [L4, M2] | Claude Opus 5.5 via Claude Code (Pro subscription), effort medium, only 8 tasks, 3 scores, median |
| Profiles [E3] | A: correctness 0.40, format 0.25, stability 0.15, cost 0.10, latency 0.10. B: correctness 0.25, format 0.10, stability 0.10, cost 0.40, latency 0.15 |
| Cost [M4] | USD; two sums: criterion cost (without cache) and billed cost (with cache) |
| Usability criterion [E2] | 4 conditions (see phase 8) |

---

## Phase 0 – Setup and task bank v1.3

- [x] Node 24 project (`"type": "module"`), `.gitignore` (incl. `.env`), `.env.example` with five keys.
- [x] Copy the v1.2 task bank, the category 2 schema register and `schemas/` into `data/`.
- [x] Build `task_bank_v1_3.json` [L2, L4]:
  - remove the system prompt from the measurement instructions and the note about fixing the thinking mode (provider defaults are used);
  - add the user message template: K1 and K3 `Tekst:\n{input}\n\n{instruction}`, K2 `Tekst:\n{input}\n\nSkeem:\n{schema}\n\n{instruction}`;
  - `language_check`: franc returns `ekk` for Estonian, not `est`;
  - 9 regexes starting with the Python `(?i)`: remove `(?i)` and use the JS `i` flag (Node does not support `(?i)`);
  - K3-032 ("viis", "kolm") and K3-030 ("juht"): add word boundaries so that substrings do not give false positives;
  - **the 8 judge tasks stay** (K3-026, -027, -028, -031, -033, -035, -037, -039); update `judge_instructions`: the judge is Claude Opus 5.5, score 0/1/2, 3 times, median.
- [x] Check script: 120 tasks, 40 in each category, difficulty levels 10/15/15 per category, every reference passes its own check (judge tasks: only `extra_rules`), all regexes compile in Node.

**Done when:** the check script passes.

## Phase 1 – Adapters

- [x] Common interface: input is the model and the user message; output is `text`, `modelVersion`, `usage` (input, output, input read from cache, reasoning tokens if the provider reports them separately), `ttftMs`, `totalMs`, `finishReason`.
- [x] Only the model, the user message and the maximum output length 16,000 are sent. Non-generative options needed for measurement are allowed (e.g. `stream_options.include_usage` for OpenAI-compatible APIs, so that the stream carries token counts).
- [x] Adapters: `openaiCompatible` (OpenAI, xAI, DeepSeek), `anthropic`, `google`, `fake`. Before writing each adapter, check the provider's current documentation (name of the max output parameter, cache and reasoning token fields).
- [x] Streaming; time with `performance.now()`.
- [x] A probe request to every model **through the pipeline** (logged like every other request) [PK9]. If a model does not stream or does not answer, stop and ask the author.

**Done when:** the tests pass and all five models answer the probe request.

## Phase 2 – Measurement pipeline

- [x] Rounds: the outer loop is the repeat, the inner loop is tasks × models [M7].
- [x] Every request is stored as a raw row (see CLAUDE.md); the file only grows.
- [x] An interrupted run can be resumed: keys already stored are not repeated.
- [x] Errors [PK1]: 429, 5xx and timeout → up to 3 retries with increasing wait; persistent error → error row (`status: "error"`). A model refusal, an empty answer or an answer truncated by length is a normal answer.
- [x] Start: `node src/runner/run.js --config config/run.pilot.json`; flags `--dry-run` (fake adapter) and `--limit N`.
- [x] Configs: `run.pilot.json`, `run.main.json`, `run.luna.json`.

**Done when:** `--dry-run` gives the right number of rows and an interrupted run resumes without duplicates.

## Phase 3 – Automatic scoring (rules)

Every answer gets **format** (0/1) and **correctness** (0…1). Raw rows with errors are skipped.

- [x] **K1:** format = the answer is (ignoring whitespace, case-insensitively, and ignoring one final period: author's decision 3.11.2026) one of the allowed answers; correctness = after the task bank normalization it matches the reference.
- [x] **K2** [M2a, M2b]:
  - format = the answer parses as JSON **without changes** and matches the schema (code fence markers ``` → format 0);
  - correctness is computed after removing the code fence markers; if the JSON still does not parse → 0;
  - comparison: text fields with normalized whitespace and case-insensitively; numbers as numbers; `null` must be `null`; a list is correct if the elements are the same (order does not matter);
  - correctness = share of correct top-level fields.
- [x] **K3 (32 rule-based tasks):** format = length and structure rules; correctness = share of content rules passed (required facts, language, forbidden content).
- [x] **K3 (8 judge tasks):** format = `extra_rules`; correctness comes from phase 3b.
- [x] Words and sentences are counted according to the task bank definitions.
- [x] Tests: every reference gets the maximum score.

**Done when:** the tests pass and the author has checked 20 random scores by hand.

## Phase 3b – LLM judge [L4, M2c, M2d]

- [x] `src/judge/prepare.js`: every answer to a judge task → anonymous file `results/judge/input/H####.json` containing **only** the source text, the instruction, the rubric and the answer. IDs are random and the order is shuffled (fixed seed). The key `results/judge/key.csv` (H#### → raw row `key`) is separate.
- [x] `src/judge/run.js`: every file is scored with **3 separate** calls:
  ```
  claude -p --safe-mode --system-prompt-file prompts/judge.txt --tools "" \
    --model claude-opus-5-5 --effort medium \
    --output-format json --json-schema <schema: score 0|1|2, justification> \
    --no-session-persistence
  ```
  - **`ANTHROPIC_API_KEY` is removed** from the child process environment (otherwise Claude Code bills through the API);
  - runs in an empty temporary folder;
  - every score is stored in `results/judge/scores.jsonl` (ID, repeat 1–3, score, justification, model from the response, `claude --version`);
  - invalid response (not JSON or the score is not 0/1/2) → new attempt; 3 invalid in a row → score missing, reported;
  - when the usage limit is hit, wait and continue; an interrupted run can be resumed.
- [x] Median of three; correctness 0 → 0, 1 → 0.5, 2 → 1; joined to the score rows by the key.

**Done when:** `--dry-run` (fake judge) works and the score of one real file is stored.

## Phase 4 – Cost [M4]

- [x] `config/pricing.json`: each model's input, cache and output price per 1M tokens (USD) and the price list date. For DeepSeek, peak and off-peak prices (peak hours Mon–Fri 01–04 and 06–10 UTC). Prices on 1.11.2026: Terra 1/5 (cache 0.05); Sonnet 5.5 2/10; Gemini 3.8 Flash 0.75/3.75; DeepSeek flash peak 0.30/1.20 (cache 0.006), off-peak half of that; grok-4.7 2/6. Cache prices from the official price lists (checked 3.11.2026, the other prices unchanged): Sonnet 5.5 0.10 (0.05× input; cache writes 2.50 for 5 min, 4.00 for 1 h); Gemini 3.8 Flash 0.075; grok-4.7 0.50; Terra cache write 1.25 (30 min). Check all prices again on the day of measurement.
- [x] Two sums for every raw row:
  - `costCriterion`: all input at full price (as if every request were new) + output (reasoning tokens as output) → used in the WSM;
  - `costBilled`: input read from cache at the cache price (and input written to cache at the cache write price, where the provider bills it) → used in the billing check.
- [x] The DeepSeek price is chosen by `tsStartUtc`.

**Done when:** the tests pass (incl. the peak hour boundary and the cache).

## Phase 5 – Pilot run [L5, PK3]

- [x] 5 models × 120 tasks × 1 time = 600 requests; scoring, judge (40 answers × 3 = 120 scores), cost.
- [x] Short report: errors and truncated answers per model; actual cost and time and the estimate for the main run; suspicious tasks (e.g. all models fail the same way, the reference looks wrong); judge usage limit status.
- [x] The author reviews ~20 judge scores and 20 rule scores.
- [x] The author decides. Only faulty tasks, faulty code and, if needed, the judge level (medium → high) may be changed.
- [x] Freeze: git tag `main-run`. After that the test set, the template and the configuration are not changed.

**Done when:** the report exists, the author's decisions are made and the tag exists. Pilot run data is not used in the main comparison.

## Phase 6 – Main run [PK4]

- [x] 5 × 120 × 5 = 3000 requests in rounds, in as short a time as possible (1–2 days).
- [x] Scoring, judge (200 answers × 3 = 600 scores) and cost for all rows.

**Done when:** all rows exist and are scored.

## Phase 7 – Analysis

All tables and figures with one command: `python analysis/run_all.py`.

- [x] **Criteria per model** (overall and by category):
  - correctness: mean; format compliance: mean [M3];
  - cost: mean `costCriterion` per task [M4];
  - latency: median `totalMs`; median `ttftMs` as additional information [M5];
  - stability: standard deviation (population, ddof=0) of the correctness of the 5 repeats of each task, averaged over tasks [M6];
  - also the number of errors and truncated answers [PK1].
- [x] **Min-max** [M8]: correctness and format (x − min)/(max − min); cost, latency, stability (max − x)/(max − min); if max = min, all get 1.
- [x] **WSM** [M9]: aggregate score for both profiles, ranking, chosen model.
- [x] **Annual cost** [PK7]: mean `costCriterion` × 10,000 × 365 per model; a table per profile with the difference from the chosen model; the difference between the choices of the two profiles. USD (one exchange rate to euros, stated as an assumption).
- [x] **Sensitivity analysis** [M10]: one weight at a time 0…1 in steps of 0.05, the others proportionally (sum 1); a table of the weights at which the winner changes (criterion × profile); 1–2 figures.
- [x] **Category comparison** [M11]: criteria and min-max within the category, the same weights; table 3 categories × 2 profiles.
- [x] Output `results/figures/wsm_check_input.csv` (criterion values and aggregate scores) for the manual check in `analysis/wsm_check.xlsx` [M12].

**Done when:** `run_all.py` creates all tables and figures from a clean state.

## Phase 8 – Validation and the usability criterion [E2]

**1. Correctness of calculations [M12]**
- [x] Unit tests with hand-calculated examples (min-max, WSM, stability, cost, annual cost).
- [x] The author checks the results of one profile in `analysis/wsm_check.xlsx` ("everything matches").

**2. Reproducibility [M13]**
- [x] `run_all.py` twice with the same data → the hashes of the output files are identical.
- [x] Sixth model `gpt-6-luna` only as a row in `config/models.json`; `run.luna.json` with ~10 tasks (from every category, without judge tasks); passes the pipeline, scoring, cost and analysis without code changes. Not part of the main comparison.

**3. Billing check [PK9]**
- [x] Sum of `costBilled` per provider (all requests made with the experiment key: probe requests, pilot run, main run, Luna) vs the dashboard; difference in percent. The author takes screenshots of the dashboards.

**4. Human evaluation [M14]**
- [x] Sample of 60 answers from the main run, fixed seed: 3 categories × 5 models × 4; in K3, for each model 2 rule-scored and 2 judge-scored answers.
- [x] `results/human/sample.csv` (answerId, source text, task, answer; without the model name, shuffled) and `key.csv` separately.
- [x] Google Apps Script that creates a Google Form from `sample.csv`: every answer a separate question (ID in the title, text in the description), required 0/1/2, optional comment, shuffled order, a rating guide with examples at the start. The form and the guide are in Estonian.
- [x] Raters' answers (Sheets → CSV) → `scores_rater1.csv`, `scores_rater2.csv`.
- [x] Automatic correctness on the 0/1/2 scale: 0 → 0, in between → 1, 1 → 2; the judge median directly.
- [x] Weighted Cohen's kappa with **linear weights** (`sklearn cohen_kappa_score(weights="linear")`): r1–r2, r1–auto, r2–auto; also descriptively for the judge-scored answers separately.

**5. Usability table [E2]**
- [x] Table with the four conditions and the result: (1) the process completed and a choice made for both profiles; (2) calculations correct and reproducible (items 1–2); (3) r1–auto and r2–auto kappa ≥ 0.61; (4) billing difference < 5%.

**Done when:** all results are in tables.

## Phase 9 – Appendices [S9]

- [x] `README.md`: installation, API keys, the Claude Code judge, how to run each step.
- [x] Public GitHub repository without the `.env` file: code, test set v1.3, judge prompt, rater guide, raw data.

**Every phase of the plan (0–9) is done** (16.11.2026; the repository was made public on the same day).

---

## Schedule

| Time | Phases | Thesis text at the same time |
|---|---|---|
| 02.11–08.11 | 0, 1, 2 | 1. Background and related work |
| 09.11–15.11 | 3, 3b, 4 | 2. Methodology (incl. the E2 criterion before the main run) |
| 16.11–18.11 | 5; meeting with Lepikult | 3. Carrying out the study |
| 19.11–22.11 | 6 (the date 21.11 in the OpenAI price list is for GPT-5.6 Sol, not for Terra: Terra has no temporary discount, checked 3.11.2026) | |
| 23.11–28.11 | 7, 8 (human evaluation ~24.–27.11) | 4. Results, 5. Discussion, introduction, summary |
| **30.11** | **thesis for pre-defence** | |
| 01.12–05.01 | 9; corrections | final version |
