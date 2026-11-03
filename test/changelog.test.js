// CHANGELOG.md: every change has an I (implementation) or U (update) row; the numbers of each letter
// run 1, 2, 3 … without gaps in the order of the rows, new rows at the end (AGENTS.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const text = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const rows = text.split('\n')
  .map((line) => line.match(/^\| ([IU])(\d+) \| (\d{4}-\d{2}-\d{2}) \| (.*?) \| (.*?) \|$/))
  .filter(Boolean)
  .map(([, letter, n, date, what, files]) => ({ id: `${letter}${n}`, letter, n: Number(n), date, what, files }));

test('the change log has rows', () => {
  assert.ok(rows.length >= 30, `${rows.length} rows`);
});

test('the numbers of I and of U run 1, 2, 3 … without gaps, in the order of the rows', () => {
  for (const letter of ['I', 'U']) {
    const numbers = rows.filter((r) => r.letter === letter).map((r) => r.n);
    assert.deepEqual(numbers, numbers.map((_, i) => i + 1), `${letter}: ${numbers.join(', ')}`);
  }
});

test('the dates never go back (new rows at the end)', () => {
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].date >= rows[i - 1].date, `${rows[i].id} (${rows[i].date}) is before ${rows[i - 1].id} (${rows[i - 1].date})`);
  }
});

test('every row says what changed and where', () => {
  for (const r of rows) {
    assert.ok(r.what.trim().length > 10, `${r.id}: what`);
    assert.ok(r.files.trim().length > 0, `${r.id}: files`);
  }
});

test('every table row of the change log is a valid I or U row', () => {
  const tableRows = text.split('\n').filter((l) => /^\| [A-Z]/.test(l) && !l.startsWith('| ID '));
  assert.equal(tableRows.length, rows.length, 'a row does not match "| I12 | 2026-11-03 | what | files |"');
});
