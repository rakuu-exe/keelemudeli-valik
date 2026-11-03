// config/profiles.json: the usage profiles of E3 and the daily volume of PK7.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../config/profiles.json', import.meta.url), 'utf8'));

test('five criteria; every profile weights each of them, and the weights sum to 1', () => {
  assert.deepEqual(config.criteria, ['correctness', 'format', 'stability', 'cost', 'latency']);
  for (const [id, p] of Object.entries(config.profiles)) {
    assert.deepEqual(Object.keys(p.weights).sort(), [...config.criteria].sort(), id);
    const sum = Object.values(p.weights).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${id}: ${sum}`);
  }
});

test('the weights of E3: A quality first, B cost first', () => {
  assert.deepEqual(config.profiles.A.weights, { correctness: 0.40, format: 0.25, stability: 0.15, cost: 0.10, latency: 0.10 });
  assert.deepEqual(config.profiles.B.weights, { correctness: 0.25, format: 0.10, stability: 0.10, cost: 0.40, latency: 0.15 });
  assert.equal(config.profiles.A.nameEt, 'kvaliteet ennekõike');
  assert.equal(config.profiles.B.nameEt, 'kulu ennekõike');
});

test('annual cost: 10,000 tasks a day, 365 days [PK7]', () => {
  assert.equal(config.dailyVolume, 10000);
  assert.equal(config.daysPerYear, 365);
});
