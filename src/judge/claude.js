// One judge call: `claude -p` with the flags of PLAN.md phase 3b, as a child process.
//  - The child's environment has no ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN); otherwise Claude Code
//    would bill through the API, mixing with the Sonnet cost, instead of using the Pro subscription.
//  - It runs in a new empty temporary folder, so there is no project, CLAUDE.md or key file to see;
//    --safe-mode turns off customizations and MCP servers, --tools "" all tools (only the
//    StructuredOutput tool of --json-schema remains, checked 3.11.2026).
//  - The input goes to stdin; --no-session-persistence: nothing is saved, every call is a new session.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANSWER_SCHEMA, JUDGE_MODEL } from './common.js';

export const PROMPT_FILE = fileURLToPath(new URL('../../prompts/judge.txt', import.meta.url));
export const CALL_TIMEOUT_MS = 10 * 60 * 1000;

export const claudeArgs = (promptFile = PROMPT_FILE) => [
  '-p',
  '--safe-mode',
  '--system-prompt-file', promptFile,
  '--tools', '',
  '--model', JUDGE_MODEL,
  '--effort', 'medium',
  '--output-format', 'json',
  '--json-schema', JSON.stringify(ANSWER_SCHEMA),
  '--no-session-persistence',
];

const REMOVED = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'];

// A copy of the environment without the API credentials (Windows names are case-insensitive).
export function judgeEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !REMOVED.includes(k.toUpperCase())));
}

export function claudeVersion(command = 'claude') {
  return execFileSync(command, ['--version'], { encoding: 'utf8', env: judgeEnv(process.env), windowsHide: true }).trim();
}

// Returns callJudge(input) → Promise<{ exitCode, stdout, stderr, timedOut }>.
// command and args can be replaced in tests (a stand-in script instead of claude).
export function createClaudeCall({
  command = 'claude', promptFile = PROMPT_FILE, timeoutMs = CALL_TIMEOUT_MS, args = claudeArgs(promptFile),
} = {}) {
  return (input) => new Promise((resolve) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-'));
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const finish = (exitCode, extra = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.rmSync(cwd, { recursive: true, force: true });
      resolve({ exitCode, stdout, stderr: stderr + extra, timedOut });
    };
    const child = spawn(command, args, {
      cwd, env: judgeEnv(process.env), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => finish(null, String(e)));
    child.on('close', (code) => finish(code));
    child.stdin.on('error', () => {}); // the process may exit before reading stdin; 'close' reports it
    child.stdin.end(input, 'utf8');
  });
}
