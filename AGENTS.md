# AGENTS.md

Rules for every AI agent (Claude Code, Codex, …) and every person who changes this repository. The project rules, formats and decisions are in [`CLAUDE.md`](CLAUDE.md); the scope is [`PLAN.md`](PLAN.md). Read both before changing anything.

Every change does three things in the same commit: **(1) a row in the change log, (2) the documentation, (3) `CLAUDE.md` if a rule, format or decision changes.**

## Record every change in the change log

**Every implementation and every change gets a row in [`CHANGELOG.md`](CHANGELOG.md)** (author's decision 3.11.2026):

- **I** + the next free number for an implementation: something new (a module, a tool, a config, a test, a data set, a document), e.g. `I29`.
- **U** + the next free number for an update: a change of something that exists (a rule, a format, a decision, a fix, a move or rename), e.g. `U12`.

How:

1. Look at the last `I` and the last `U` number in `CHANGELOG.md`; the new row gets the next one. Never reuse or skip a number, never renumber old rows.
2. Add the row **at the end** of the table: `| I29 | YYYY-MM-DD | what changed and why, with the decision tag or "author's decision <date>" | the files |`.
3. One row per logical change. A change that both adds something and changes something else gets one I row and one U row.
4. Start the commit message with the IDs, e.g. `I29, U12: …`, so that `git log --grep "I29"` finds the commit.
5. Rows are not edited afterwards, except to fix a mistake in the row itself.

## Keep the documentation up to date

**Every change updates the documentation in the same commit.** The documentation is in [`docs/`](docs/README.md): an overview and a file map in `docs/README.md`, and one doc per part of the repository.

| when you … | update |
|---|---|
| add a file | a row in the file map of `docs/README.md` (or make sure an existing pattern row covers it) and its description in the doc of that row |
| delete or rename a file | the file map row and the doc |
| change what a file does: its command-line options, inputs, outputs, exported functions or rules | the doc of the file |
| change a data format, a rule, a principle or a decision of the author | `CLAUDE.md` (with the date of the decision) and the docs that describe it |
| change a scoring, cost or analysis rule | `CLAUDE.md` and the doc ([scoring](docs/scoring.md), [cost](docs/cost.md), [analysis](docs/analysis.md)) |
| change the plan | `PLAN.md` only on the author's decision |

How to write a doc entry: in English (the repository language; only the tasks and what reaches a model, the judge or the raters are in Estonian), short, and for each file: what it is for, what it reads and writes, how it is run, and the decision tags (e.g. [M4]) it follows. Describe what the file does now, not its history (the history is in `CHANGELOG.md`, git and `data/CHANGES_v1_3.md`).

## The checks

`npm test` includes two checks:

- `test/docs.test.js` fails when a file of the repository (tracked, or new and not ignored) matches no row of the file map, when a file map row without `*` names a file that does not exist, or when the doc of a row does not name the row's file or pattern in backticks.
- `test/changelog.test.js` fails when the I or U numbers have a gap or are out of order, when a date goes back, or when a row has no description or files.

A failing check means the change log or the documentation is behind: fix them, never the test.

## Before every commit

1. A row in `CHANGELOG.md` for every change, and the commit message starts with the IDs.
2. The docs, `CLAUDE.md` and, if the author decided so, `PLAN.md` describe the change.
3. `npm test` passes (and `.venv/Scripts/python -m unittest discover -s analysis/tests` if `analysis/` changed).
4. Raw data (`results/raw/`, `results/judge/scores.jsonl`) has only new rows; nothing in it was changed or deleted.
5. Commit only when the author asks for it.
