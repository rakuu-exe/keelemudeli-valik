# Project files (the root)

## `README.md`
The entry point for a reader of the public repository (PLAN.md phase 9 [S9]): what the parts are, the requirements, installation and tests, computing the results again from the stored data, a dry run without keys, the API keys, a measurement from start to end, the LLM judge through Claude Code, adding a model, the human evaluation, the main rules of the measurement, how generative AI was used (the code written with Claude Code, the tasks written by the author, what the author did) and the licences. Every command in it was run on 11.11.2026 (the dry run chain; `score.js`, `cost.js` and `run_all.py` on the main run gave unchanged files).

## `AGENTS.md`
Rules for every agent and contributor that changes the repository: each change gets a row in `CHANGELOG.md` and updates the docs (and `CLAUDE.md` for rules and decisions) in the same commit; the commit message starts with the change's IDs. It points to `CLAUDE.md` for everything else.

## `CHANGELOG.md`
Every implementation and every change, one row each: `I` + number for something new, `U` + number for a change of something that exists; the numbers of each letter run without gaps, new rows at the end. Columns: ID, date, what (with the decision tag or the author's decision and, for the rows written from the history, the commit), files. Checked by `test/changelog.test.js`.

## `CLAUDE.md`
The project instructions, read by Claude Code at the start of every session: what is built, the principles (measure once, raw data is never changed, the same task text for every model, provider defaults, …), the LLM judge rules, the terminology, the data formats (raw row, score row, judge, cost row, human evaluation), the scoring and cost rules, the commands of a run, the analysis rules and the author's decisions with their dates. A change of a rule, a format or a decision goes here.

## `PLAN.md`
The work plan of the author: the confirmed choices, the phases 0–9 with their "done when" criteria, and the schedule; a ticked box is a finished item. Only what is in the plan is built (CLAUDE.md). Tags in brackets (e.g. [M4]) refer to the rows of the author's `kavandi_tooplaan.xlsx`, which is not in the repository.

## `LICENSE`
The MIT License (copyright Ragnar Rand, 2026) for the code and the configuration: `src/`, `test/`, the Python files of `analysis/`, `tools/apps_script/create_form.gs`, `config/` and the package files. Which part has which licence is listed in `README.md`, "Licence" (author's decision 16.11.2026).

## `LICENSE-CC-BY-4.0`
The legal text of Creative Commons Attribution 4.0 International, unchanged from creativecommons.org, for the test set, the judge prompt, the rater guide, the data and the documentation: `data/`, `prompts/`, `tools/apps_script/rater_guide.txt`, `results/`, `analysis/wsm_check.xlsx`, `docs/` and the other Markdown files. The screenshots in `results/prices/` and `results/billing/` are not covered by either licence: they show the pages of the providers.

## `package.json`
The Node package (ESM, Node 24). Dependencies with exact versions: `openai`, `@anthropic-ai/sdk`, `@google/genai`, `ajv`, `franc`, `dotenv`.
- `npm test`: all Node tests, `node --test "test/**/*.test.js"` (only `*.test.js`, so that the fixtures are not run).
- `npm run check`: the task bank check script (`test/taskBank.test.js`).

## `package-lock.json`
The exact dependency tree that `npm ci` installs.

## `.env.example`
Template of `.env`: one variable per provider (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`). The real `.env` is never committed; the pipeline reads the keys only from it, not from the system environment.

## `.gitignore`
Ignored by git: `.env`, `node_modules/`, `.venv/`, Python caches, `results/dry-run/`, Claude Code worktrees, and the author's personal source files (`Rand_Ragnar_kavand.pdf`, `kavandi_tooplaan.xlsx`, `ulesandepank_v1_2.zip`).

## `.gitattributes`
All text files with LF line endings (the reproducibility test compares file hashes); PDF, XLSX and PNG are binary.

## `docs/*.md`
This documentation: [README](README.md) (overview and the file map) and one doc per part of the repository.
