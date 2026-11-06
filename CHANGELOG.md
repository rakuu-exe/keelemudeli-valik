# Change log

Every implementation and every change of the repository, one row each (author's decision 3.11.2026).

- **I** = implementation: something new (a module, a tool, a config, a test, a data set, a document).
- **U** = update: a change of something that exists (a rule, a format, a decision, a fix, a move or rename).

The numbers of each letter run without gaps (I1, I2, I3 …; U1, U2, U3 …). New rows go **at the end**, with the next free number. The commit message of a change starts with its IDs (e.g. `I28, U15: …`), so `git log --grep "I28"` finds the commit; for the rows written afterwards from the history the commit is named in the row. The task bank's own changes are also in `data/CHANGES_v1_3.md`. Rules: [`AGENTS.md`](AGENTS.md); checked by `test/changelog.test.js`.

| ID | date | what | files |
|---|---|---|---|
| I1 | 2026-11-01 | Project set up: project instructions, work plan, ignored files (commit d2e5727) | `CLAUDE.md`, `PLAN.md`, `.gitignore` |
| I2 | 2026-11-01 | LF line endings in all text files, so that file hashes can be compared (8571ab1) | `.gitattributes` |
| I3 | 2026-11-01 | Phase 0: Node project (ESM), template of the key file with five keys; ajv and franc with exact versions (e59e95f) | `package.json`, `.env.example` |
| I4 | 2026-11-01 | The task bank v1.2 copied unchanged from the zip file (ef69bca) | `data/` |
| I5 | 2026-11-01 | Task bank v1.3 and its change log: system prompt removed, user message template, franc code `ekk`, 9 regexes with the `i` flag, word boundaries in K3-032 and K3-030, judge instructions [L2, L4] (485bf14) | `data/task_bank_v1_3.json`, `data/CHANGES_v1_3.md` |
| I6 | 2026-11-01 | The task bank check script and the rule modules: loading the bank and the template, word and sentence counting, language check, regexes, K3 rules, K1 normalization (838e9c6) | `src/taskBank.js`, `src/checkers/`, `test/taskBank.test.js`, `test/text.test.js` |
| U1 | 2026-11-01 | Author's decisions 1.11: Node.js 24; K3-005 regex case-insensitive; franc chooses only between Estonian and English (d861997) | `CLAUDE.md`, `PLAN.md`, `package.json`, `data/` |
| I7 | 2026-11-02 | Phase 1: the adapters (OpenAI-compatible, Anthropic, Google, fake) with one interface; only the model, one user message and max output 16,000 are sent; streaming; SDK retries off; five models in the config (9d1f990) | `src/adapters/`, `config/models.json`, `test/adapters.test.js` |
| I8 | 2026-11-02 | Raw rows and the first pipeline: run config → requests, raw rows appended, stored keys skipped, keys only from `.env`; the probe config; raw row field `usageRaw` (author's decision 2.11) (627e97e) | `src/runner/run.js`, `src/runner/rawRows.js`, `config/run.probe.json`, `CLAUDE.md` |
| U2 | 2026-11-02 | The repository in English, only the tasks (and what reaches a model or the judge) in Estonian; task bank keys, file names and data formats renamed; content byte-identical (author's decision 2.11) (86f04a3) | whole repository |
| I9 | 2026-11-03 | The probe request: all five models answered K1-001 through the pipeline; runId moved to the day of the probe (ec64f84) | `results/raw/2026-11-03-probe.jsonl`, `config/run.probe.json` |
| I10 | 2026-11-03 | Phase 2: retries of temporary errors (10 s, 30 s, 60 s) and a 10-minute timeout per attempt; earlier failed attempts in the raw row field `retries` (2d6d45b) | `src/runner/retry.js`, `src/runner/rawRows.js` |
| I11 | 2026-11-03 | The run stops after 5 error rows in a row (overall or for one model); Ctrl+C stops after the current request (2d6d45b) | `src/runner/run.js` |
| I12 | 2026-11-03 | `--dry-run` (fake adapter) and `--limit N` (2d6d45b) | `src/runner/run.js`, `.gitignore` |
| I13 | 2026-11-03 | Run configs of the pilot run, main run and Luna test; gpt-6-luna in the models (2d6d45b) | `config/run.pilot.json`, `config/run.main.json`, `config/run.luna.json`, `config/models.json` |
| U3 | 2026-11-03 | Adapters pass an abort signal to the SDK; an aborted OpenAI stream is an error, not an incomplete normal answer (2d6d45b) | `src/adapters/` |
| U4 | 2026-11-03 | The four phase 2 choices (retries field, per-model stop, runIds without a date, Ctrl+C) marked as the author's decisions (134f247) | `CLAUDE.md` |
| I14 | 2026-11-03 | Phase 3: rule-based scoring of K1, K2 and K3 and the score rows; K1 format ignores one final period, judge-task format from the length rules only, an empty K3 answer gets 0 and 0 (author's decisions) (870fd8b) | `src/checkers/score.js`, `src/checkers/k1.js`, `src/checkers/k2.js`, `src/checkers/k3.js`, `src/checkers/schemas.js`, `test/scoring.test.js` |
| I15 | 2026-11-03 | Score row field `nullViolations` (K2 expected_null fields that got a value; author's decision) (870fd8b) | `src/checkers/k2.js`, `CLAUDE.md` |
| I16 | 2026-11-03 | The manual check sample: 20 rule scores with a fixed seed (870fd8b) | `src/checkers/sample.js` |
| I17 | 2026-11-03 | Phase 3b: the LLM judge: anonymous files, 3 separate `claude -p` calls, invalid answers, usage limit, other models, resume; the judge prompt; the median joined to the score rows (f3ae863) | `src/judge/`, `prompts/judge.txt`, `src/checkers/score.js`, `test/judge.test.js` |
| I18 | 2026-11-03 | The judge check set: the K3-026 sample answer scored 2, 2, 2 by the real judge (f3ae863) | `results/judge-check/` |
| I19 | 2026-11-03 | Shared modules: result paths, seeded randomness, CSV (f3ae863) | `src/paths.js`, `src/random.js`, `src/csv.js` |
| U5 | 2026-11-03 | Judge answer keys in English (`score`, `justification`; task bank item 1.12); the dry run layout under `results/dry-run/{raw,scored,judge}`; `npm test` runs only `*.test.js` (f3ae863) | `data/task_bank_v1_3.json`, `data/CHANGES_v1_3.md`, `src/runner/run.js`, `package.json` |
| I20 | 2026-11-03 | Phase 4: the price list and the two cost sums (costCriterion, costBilled; DeepSeek peak hours; cache reads and writes) (5e13edb) | `config/pricing.json`, `src/cost/cost.js`, `test/cost.test.js` |
| U6 | 2026-11-03 | PLAN.md: the cache prices, cache writes in costBilled, and the 21.11 date in the OpenAI price list belongs to GPT-5.6 Sol, not Terra (author's decisions) (5e13edb) | `PLAN.md` |
| I21 | 2026-11-03 | Phase 5: the pilot run (600 requests), the judge's 120 scores, score and cost rows (436b8dd) | `results/raw/pilot.jsonl`, `results/judge/`, `results/scored/`, `results/cost/` |
| I22 | 2026-11-03 | The pilot report, its data tool and the blind judge review tool (436b8dd) | `src/report/pilot.js`, `src/judge/review.js`, `results/pilot/`, `test/report.test.js` |
| I23 | 2026-11-03 | The private GitHub repository rakuu-exe/keelemudeli-valik; main = phase 5, all phase branches pushed | GitHub |
| U7 | 2026-11-03 | One working copy: the Desktop folder on the current branch; the old worktree removed after copying `.env` | local folders |
| U8 | 2026-11-03 | The pilot report names the place of every finding (files, lines, raw rows) (515ead9) | `results/pilot/report.md` |
| U9 | 2026-11-03 | The author's review (20 + 20 scores, all OK) and decisions on F1–F8 (K1-011 stays "ei", nothing else changes) (9c3c06b) | `results/pilot/`, `results/scored/pilot.manual_check.md` |
| I24 | 2026-11-03 | The usage profiles A and B with the weights of E3 and the daily volume (d3a4cd5) | `config/profiles.json`, `test/profiles.test.js` |
| I25 | 2026-11-03 | The author's price list screenshots of 3.11.2026 [M4] (d3a4cd5) | `results/prices/2026-11-03/` |
| I26 | 2026-11-03 | Phase 7: the analysis in Python (criteria, min-max, WSM, annual cost, sensitivity, categories, figures, summary; byte-identical outputs; 11 unit tests) and a preview on the pilot data (7ca00d3) | `analysis/`, `results/figures/pilot/` |
| U10 | 2026-11-03 | The author's Excel check moved to `analysis/wsm_check.xlsx` (was `wsm_kontroll.xlsx`), `wsm_check_input.csv` in its column order; exchange rate 1 EUR = 1.1216 USD; stability without error rows (author's decision) (7ca00d3) | `analysis/wsm_check.xlsx`, `analysis/run_all.py`, `analysis/settings.json`, `PLAN.md` |
| I27 | 2026-11-03 | Documentation of every file (`docs/`), `AGENTS.md` (update the docs with every change) and the docs check (af7b691) | `docs/`, `AGENTS.md`, `test/docs.test.js`, `CLAUDE.md` |
| U11 | 2026-11-03 | The sensitivity tie rule confirmed by the author: a tie with the previous winner is not a change of the winner | `CLAUDE.md` |
| I28 | 2026-11-03 | This change log with I/U numbers, its rule in `AGENTS.md` and its check | `CHANGELOG.md`, `AGENTS.md`, `test/changelog.test.js`, `docs/` |
| U12 | 2026-11-06 | K1-011 reworded after the supervisor's answer: "Kas kuller andis paki kliendile isiklikult üle?" (was "Kas klient sai paki isiklikult kätte?"), reference "ei" unchanged; task bank item 1.13; the supervisor's answers (M6, S1, F5) in the pilot report (author's decision 6.11.2026) | `data/task_bank_v1_3.json`, `data/CHANGES_v1_3.md`, `results/pilot/report.md`, `docs/data.md` |
| I29 | 2026-11-06 | The usability criterion [E2] fixed before the main run: four conditions with their checks and thresholds; the Excel check in condition 2, the 5% limit per provider, values at the threshold compared as reported (author's decisions 6.11.2026) | `docs/usability_criterion.md`, `docs/README.md`, `CLAUDE.md` |
