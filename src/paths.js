// Where the results are. A dry run (fake adapter, fake judge) uses the same layout under
// results/dry-run/, which git ignores, so that it never mixes with real data.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = new URL('../', import.meta.url);
const RESULTS = fileURLToPath(new URL('results/', ROOT));

export const resultsDir = ({ dryRun = false } = {}) => (dryRun ? path.join(RESULTS, 'dry-run') : path.normalize(RESULTS));

export const rawFile = (runId, options) => path.join(resultsDir(options), 'raw', `${runId}.jsonl`);
export const scoredFile = (runId, options) => path.join(resultsDir(options), 'scored', `${runId}.jsonl`);
export const manualCheckFile = (runId, options) => path.join(resultsDir(options), 'scored', `${runId}.manual_check.md`);
export const costFile = (runId, options) => path.join(resultsDir(options), 'cost', `${runId}.jsonl`);
// The judge set: input/H####.json, key.csv, scores.jsonl. One set for all runs (the key names the run).
export const judgeDir = (options) => path.join(resultsDir(options), 'judge');
// The judge check set (PLAN.md phase 3b, "the score of one real file is stored"): one file built
// from a task bank sample answer, before any real answers to the judge tasks exist.
export const judgeCheckDir = () => path.join(RESULTS, 'judge-check');
