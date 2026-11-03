// The file map of docs/README.md against the files of the repository (AGENTS.md, "The check").
// Every tracked file, and every new file that git does not ignore, must match a row; a row without
// "*" must name an existing file; the doc of a row must name the row's file or pattern.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DOCS = new URL('../docs/', import.meta.url);

function repoFiles() {
  const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: ROOT, encoding: 'utf8' });
  const list = `${git('ls-files')}\n${git('ls-files', '--others', '--exclude-standard')}`;
  return [...new Set(list.split('\n').map((s) => s.trim()).filter(Boolean))]
    .filter((f) => fs.existsSync(new URL(f, `file:///${ROOT.replace(/\\/g, '/')}`)))
    .sort();
}

// Rows of the file map: | `path or pattern` | [doc](doc.md) | purpose |
function fileMap() {
  const text = fs.readFileSync(new URL('README.md', DOCS), 'utf8');
  const section = text.split('## File map')[1];
  assert.ok(section, 'docs/README.md has a "## File map" section');
  return section.split('\n')
    .map((line) => line.match(/^\| `([^`]+)` \| \[[^\]]+\]\(([^)]+)\) \|/))
    .filter(Boolean)
    .map(([, pattern, doc]) => ({ pattern, doc }));
}

const toRegex = (pattern) => new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);

const files = repoFiles();
const rows = fileMap();

test('every file of the repository is in the file map', () => {
  // the list really has the repository (so that an empty list cannot pass)
  for (const f of ['CLAUDE.md', 'src/runner/run.js', 'data/task_bank_v1_3.json', 'docs/README.md']) assert.ok(files.includes(f), f);
  const regexes = rows.map((r) => toRegex(r.pattern));
  const missing = files.filter((f) => !regexes.some((re) => re.test(f)));
  assert.deepEqual(missing, [], `add these to the file map of docs/README.md: ${missing.join(', ')}`);
});

test('every row without * names a file that exists', () => {
  const stale = rows.filter((r) => !r.pattern.includes('*') && !files.includes(r.pattern)).map((r) => r.pattern);
  assert.deepEqual(stale, [], `remove or fix these rows: ${stale.join(', ')}`);
});

test('the doc of every row exists and names the row\'s file or pattern', () => {
  const problems = [];
  for (const { pattern, doc } of rows) {
    const url = new URL(doc, DOCS);
    if (!fs.existsSync(url)) {
      problems.push(`${pattern}: no ${doc}`);
      continue;
    }
    if (!fs.readFileSync(url, 'utf8').includes(`\`${pattern}\``)) problems.push(`${pattern}: not named in docs/${doc}`);
  }
  assert.deepEqual(problems, []);
});

test('the file map has no duplicate rows', () => {
  const seen = rows.map((r) => r.pattern);
  assert.equal(new Set(seen).size, seen.length);
});
