# Reports (`src/report/`)

## `src/report/pilot.js`
```
node src/report/pilot.js --run pilot
```
The data of the pilot run report (PLAN.md phase 5) → `results/pilot/report_data.md`, from the raw, score and cost rows and the judge set:

- per model: answers, errors, retries, truncated and empty answers, format, correctness, costBilled, costCriterion per request, median latency and TTFT, mean output and reasoning tokens;
- the errors and truncated answers one by one;
- time and cost, and the estimate for the main run (× 5 repeats), per model;
- suspicious tasks: all models correctness 0, all models format 0, mean correctness below 0.5, K1 answers that are right apart from Markdown marks, K2 answers with format 0;
- the judge: files, scores, missing scores, invalid attempts, models, Claude Code versions, files with disagreeing repeats, score distribution.

Only counts and lists; the conclusions are written by hand into `results/pilot/report.md`. `buildReportData` is exported for the tests.

The two review files of phase 5 come from `src/checkers/sample.js` ([scoring](scoring.md)) and `src/judge/review.js` ([judge](judge.md)).
