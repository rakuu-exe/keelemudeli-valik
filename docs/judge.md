# LLM judge (`src/judge/`, `prompts/`)

Correctness of the 8 faithfulness tasks (K3-026, -027, -028, -031, -033, -035, -037, -039) [L4, M2c, M2d]. The judge is Claude Opus 5.5 through Claude Code on the author's Pro subscription, never one of the compared models; it never sees the model name. Rules: CLAUDE.md, "LLM judge".

## `src/judge/prepare.js`
```
node src/judge/prepare.js --run <runId> [--dry-run]
node src/judge/prepare.js --check
```
Every ok answer of the run to a judge task → `results/judge/input/H####.json` with only `id`, `sourceText`, `instruction`, `rubric`, `answer`; a row `id,key` in `results/judge/key.csv`. IDs are random and the files are written in a shuffled order (seed 20261103 and the runId). Answers that already have a file are skipped; existing files are never overwritten. `--check` builds the check set `results/judge-check/` from the K3-026 sample answer.

## `src/judge/run.js`
```
node src/judge/run.js [--limit N]      results/judge/
node src/judge/run.js --dry-run        fake judge under results/dry-run/judge/
node src/judge/run.js --check          the real judge on the check set
```
Every file gets 3 separate calls (one new session each); every score is appended to `scores.jsonl`, and `(id, repeat)` pairs already there are skipped (resume). `interpretCall` decides: valid answer; invalid answer (not JSON, no structured output, score not 0/1/2, a model other than `claude-opus-5-5`) → a new attempt, 3 in a row → `score: null`; usage limit ("You've hit your … limit · resets …") → wait until the reset time (`usageLimitWaitMs`, 15 min if unreadable); other failures → retries after 10/30/60 s, then the run stops. `createFakeJudge` for dry runs and tests.

## `src/judge/claude.js`
One judge call as a child process: `claudeArgs()` are the flags of PLAN.md phase 3b (`-p --safe-mode --system-prompt-file prompts/judge.txt --tools "" --model claude-opus-5-5 --effort medium --output-format json --json-schema … --no-session-persistence`); `judgeEnv()` removes `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN`; each call runs in a new empty temporary folder, the input goes to stdin (UTF-8), a 10-minute timeout. `claudeVersion()` for the score rows.

## `src/judge/common.js`
`JUDGE_MODEL`, `ANSWER_SCHEMA` (`score` 0/1/2, `justification`), `judgeInput(file)` (the four fields only, no ID), reading a judge set (`readKey`, `readScores`, `listInputIds`, `readInputFile`), `median`, and `judgeCorrectnessByKey(dir)`: raw row key → median of the valid scores / 2, used by `src/checkers/score.js`.

## `src/judge/review.js`
```
node src/judge/review.js --run pilot [--n 20]
```
The author's blind review (phase 5): 20 judge files of the run drawn with seed 20261103, with the source text, instruction, rubric, answer, the three scores and justifications, and space for the author's own score; no model name → `results/<runId>/judge_check.md`.

## `prompts/judge.txt`
The judge's system prompt in Estonian: what the input fields are, the principle, the system rules and the output format of the task bank's `judge_instructions`, word for word (checked by `test/judge.test.js`).
