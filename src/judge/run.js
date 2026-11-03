// LLM judge (PLAN.md phase 3b, [L4, M2c, M2d]): every anonymous file gets 3 scores from 3 separate
// `claude -p` calls (claude.js); every score is appended to scores.jsonl.
//
//   node src/judge/run.js [--limit N]    results/judge/        (the real judge)
//   node src/judge/run.js --dry-run      results/dry-run/judge/ (fake judge, no calls)
//   node src/judge/run.js --check        results/judge-check/  (the real judge on the check file)
//
//   --limit N  score at most N files in this run
//
// Rules:
//  - An invalid answer (not JSON, no structured output, a score other than 0/1/2, or answered by a
//    model other than Opus 5.5) → a new attempt; 3 invalid in a row → the score is stored as null
//    and reported. The reasons are kept in invalidAttempts.
//  - Usage limit of the subscription ("You've hit your session limit · resets 3:45pm") → wait until
//    the reset time (or 15 minutes if it cannot be read) and try again; this is not an invalid answer.
//  - Other failures of the call (network, server) → wait 10 s, 30 s, 60 s and try again; if it still
//    fails, the run stops without storing anything for that score, and can be started again.
//  - (ID, repeat) pairs already in scores.jsonl are skipped, so an interrupted run resumes.
//    Ctrl+C stops after the current score.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { seedFrom } from '../random.js';
import { judgeCheckDir, judgeDir } from '../paths.js';
import {
  JUDGE_MODEL, REPEATS, VALID_SCORES, judgeInput, listInputIds, readInputFile, readScores, scoresFile,
} from './common.js';
import { claudeVersion, createClaudeCall } from './claude.js';

export const MAX_INVALID = 3;
export const ERROR_WAITS_MS = [10_000, 30_000, 60_000];
export const USAGE_LIMIT_POLL_MS = 15 * 60 * 1000;
const USAGE_LIMIT = /hit your (?:session|weekly|opus|usage) limit|usage limit reached/i;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const firstLine = (s) => (typeof s === 'string' ? s.trim().split('\n')[0].slice(0, 300) : '');

// Milliseconds until the reset time in a usage limit message ("resets 3:45pm", "resets Mon 12:00am";
// local time), plus one minute; null if no time can be read.
export function usageLimitWaitMs(message, now = new Date()) {
  const m = message.match(/resets\s+(?:([A-Za-z]{3})[a-z]*\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let hour = Number(m[2]);
  const minute = Number(m[3] ?? 0);
  const ampm = m[4]?.toLowerCase();
  if (ampm) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (ampm === 'pm' ? 12 : 0);
  }
  if (hour > 23 || minute > 59) return null;
  const t = new Date(now);
  t.setHours(hour, minute, 0, 0);
  if (m[1]) {
    const day = DAYS.indexOf(m[1].toLowerCase());
    if (day === -1) return null;
    t.setDate(t.getDate() + ((day - t.getDay() + 7) % 7));
    if (t <= now) t.setDate(t.getDate() + 7);
  } else if (t <= now) {
    t.setDate(t.getDate() + 1);
  }
  return t - now + 60_000;
}

// Interprets one call: { kind: 'ok', score, justification, model } | { kind: 'invalid', reason, model }
// | { kind: 'usage_limit', message } | { kind: 'error', message }.
export function interpretCall({ exitCode, stdout, stderr, timedOut }, { expectedModel = JUDGE_MODEL } = {}) {
  if (timedOut) return { kind: 'error', message: 'no answer before the timeout' };
  let out = null;
  try {
    out = JSON.parse(stdout);
  } catch {
    out = null;
  }
  const failed = !out || typeof out !== 'object' || out.is_error || exitCode !== 0;
  if (failed) {
    const text = [typeof out?.result === 'string' ? out.result : '', stderr ?? '', out ? '' : (stdout ?? '')].join('\n');
    const limit = text.split('\n').find((line) => USAGE_LIMIT.test(line));
    if (limit) return { kind: 'usage_limit', message: limit.trim() };
  }
  if (!out || typeof out !== 'object') {
    return exitCode === 0
      ? { kind: 'invalid', reason: 'the output is not JSON', model: null }
      : { kind: 'error', message: firstLine(stderr) || firstLine(stdout) || `exit code ${exitCode}` };
  }
  const models = Object.keys(out.modelUsage ?? {});
  const model = models.length ? models.join(',') : null;
  if (failed) {
    if (/structured_output/i.test(out.subtype ?? '')) {
      return { kind: 'invalid', reason: `no valid structured output (${out.subtype})`, model };
    }
    return { kind: 'error', message: firstLine(out.result) || out.subtype || `exit code ${exitCode}` };
  }
  if (models.length !== 1 || models[0] !== expectedModel) {
    return { kind: 'invalid', reason: `answered by ${model ?? 'an unknown model'}, not ${expectedModel}`, model };
  }
  const answer = out.structured_output;
  if (!answer || typeof answer !== 'object') return { kind: 'invalid', reason: 'no structured_output', model };
  if (!Number.isInteger(answer.score) || !VALID_SCORES.includes(answer.score)) {
    return { kind: 'invalid', reason: `score ${JSON.stringify(answer.score)} is not 0, 1 or 2`, model };
  }
  if (typeof answer.justification !== 'string') return { kind: 'invalid', reason: 'justification is not text', model };
  return { kind: 'ok', score: answer.score, justification: answer.justification, model };
}

// One score: calls until a valid answer, 3 invalid answers, or a failure that does not go away.
// Returns { score, justification, model, invalidAttempts } or { stop: { reason: 'errors', message } }.
async function scoreOnce({ input, callJudge, expectedModel, sleep, now, logEvent }) {
  const invalidAttempts = [];
  let errors = 0;
  for (;;) {
    const r = interpretCall(await callJudge(input), { expectedModel });
    if (r.kind === 'ok') return { score: r.score, justification: r.justification, model: r.model, invalidAttempts };
    if (r.kind === 'invalid') {
      errors = 0;
      invalidAttempts.push({ reason: r.reason, model: r.model });
      logEvent(`invalid answer ${invalidAttempts.length}/${MAX_INVALID}: ${r.reason}`);
      if (invalidAttempts.length >= MAX_INVALID) return { score: null, justification: null, model: r.model, invalidAttempts };
    } else if (r.kind === 'usage_limit') {
      const wait = usageLimitWaitMs(r.message, now()) ?? USAGE_LIMIT_POLL_MS;
      logEvent(`${r.message} → waiting ${Math.round(wait / 60000)} min`);
      await sleep(wait);
    } else {
      if (errors >= ERROR_WAITS_MS.length) return { stop: { reason: 'errors', message: r.message } };
      logEvent(`call failed (${r.message}) → again in ${ERROR_WAITS_MS[errors] / 1000} s`);
      await sleep(ERROR_WAITS_MS[errors++]);
    }
  }
}

// Scores the files of a judge set. Returns { added, stop } (stop as in the measurement pipeline:
// null, { reason: 'limit' }, { reason: 'interrupted' } or { reason: 'errors', message }).
export async function runJudge({
  dir, callJudge, claudeCodeVersion,
  expectedModel = JUDGE_MODEL,
  limit = Infinity,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => new Date(),
  shouldStop = () => false,
  log = () => {},
  logEvent = () => {},
}) {
  const done = new Set(readScores(dir).map((s) => `${s.id}|${s.repeat}`));
  const output = scoresFile(dir);
  const added = [];
  let files = 0;
  for (const id of listInputIds(dir)) {
    const pending = Array.from({ length: REPEATS }, (_, i) => i + 1).filter((r) => !done.has(`${id}|${r}`));
    if (!pending.length) continue;
    if (files >= limit) return { added, stop: { reason: 'limit' } };
    files++;
    const input = judgeInput(readInputFile(dir, id));
    for (const repeat of pending) {
      if (shouldStop()) return { added, stop: { reason: 'interrupted' } };
      const result = await scoreOnce({ input, callJudge, expectedModel, sleep, now, logEvent: (m) => logEvent(`${id}/${repeat}: ${m}`) });
      if (result.stop) return { added, stop: result.stop };
      const row = {
        id,
        repeat,
        score: result.score,
        justification: result.justification,
        model: result.model,
        claudeCodeVersion,
        ts: now().toISOString(),
        invalidAttempts: result.invalidAttempts,
      };
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.appendFileSync(output, JSON.stringify(row) + '\n', 'utf8');
      added.push(row);
      log(row);
    }
  }
  return { added, stop: null };
}

// Fake judge for --dry-run and tests: a deterministic score from the input, no calls.
export const FAKE_MODEL = 'fake-judge';
export function createFakeJudge() {
  return async (input) => ({
    exitCode: 0,
    stderr: '',
    timedOut: false,
    stdout: JSON.stringify({
      type: 'result', subtype: 'success', is_error: false, result: '',
      structured_output: { score: seedFrom(0, input) % 3, justification: 'Fake judge (dry run).' },
      modelUsage: { [FAKE_MODEL]: {} },
    }),
  });
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'dry-run': { type: 'boolean', default: false },
      check: { type: 'boolean', default: false },
      limit: { type: 'string' },
    },
  });
  if (values['dry-run'] && values.check) throw new Error('--dry-run and --check cannot be combined');
  if (values.limit !== undefined && !/^[1-9]\d*$/.test(values.limit)) throw new Error('--limit must be a positive integer');
  const fake = values['dry-run'];
  const dir = values.check ? judgeCheckDir() : judgeDir({ dryRun: fake });

  let stopRequested = false;
  process.on('SIGINT', () => {
    if (stopRequested) process.exit(130);
    stopRequested = true;
    console.log('Stopping after the current score. Ctrl+C again stops at once.');
  });

  const claudeCodeVersion = fake ? 'fake' : claudeVersion();
  console.log(`Judge${fake ? ' DRY RUN (fake judge)' : ` ${JUDGE_MODEL}, Claude Code ${claudeCodeVersion}`}: ${dir}`);
  const { added, stop } = await runJudge({
    dir,
    callJudge: fake ? createFakeJudge() : createClaudeCall(),
    expectedModel: fake ? FAKE_MODEL : JUDGE_MODEL,
    claudeCodeVersion,
    limit: values.limit === undefined ? Infinity : Number(values.limit),
    shouldStop: () => stopRequested,
    log: (r) => console.log(`${r.id}/${r.repeat}  score=${r.score ?? 'MISSING'}  ${r.justification ?? r.invalidAttempts.map((a) => a.reason).join('; ')}`),
    logEvent: (m) => console.log(`  ${m}`),
  });
  const missing = added.filter((r) => r.score === null).length;
  console.log(`Done: ${added.length} new scores, ${missing} missing (3 invalid answers).`);
  if (stop?.reason === 'errors') {
    console.error(`Stopped: the judge call keeps failing (${stop.message}). Run the same command again to continue.`);
    process.exitCode = 1;
  } else if (stop?.reason === 'interrupted') {
    process.exitCode = 130;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
