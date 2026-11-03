# AGENTS.md

Rules for every AI agent (Claude Code, Codex, …) and every person who changes this repository. The project rules, formats and decisions are in [`CLAUDE.md`](CLAUDE.md); the scope is [`PLAN.md`](PLAN.md). Read both before changing anything.

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

How to write a doc entry: in English (the repository language; only the tasks and what reaches a model, the judge or the raters are in Estonian), short, and for each file: what it is for, what it reads and writes, how it is run, and the decision tags (e.g. [M4]) it follows. Describe what the file does now, not its history (the history is in git and `data/CHANGES_v1_3.md`).

## The check

`npm test` includes `test/docs.test.js`, which fails when:

- a file of the repository (tracked, or new and not ignored) matches no row of the file map;
- a file map row without `*` names a file that does not exist;
- the doc of a row does not name the row's file or pattern in backticks.

A failing docs test means the documentation is behind: fix the docs, never the test.

## Before every commit

1. `npm test` passes (and `.venv/Scripts/python -m unittest discover -s analysis/tests` if `analysis/` changed).
2. The docs, `CLAUDE.md` and, if the author decided so, `PLAN.md` describe the change.
3. Raw data (`results/raw/`, `results/judge/scores.jsonl`) has only new rows; nothing in it was changed or deleted.
4. Commit only when the author asks for it.
