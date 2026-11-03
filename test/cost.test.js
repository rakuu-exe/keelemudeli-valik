// Tests of the cost calculation (PLAN.md phase 4): prices, the two sums, the DeepSeek peak hour
// boundary and the cache. Hand-calculated values; the xAI case is the real probe row of 3.11.2026,
// whose provider-reported cost (cost_in_usd_ticks) must equal costBilled.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildRawRow, readRawRows } from '../src/runner/rawRows.js';
import { ApiError } from '../src/adapters/index.js';
import { cacheWrites, computeCost, costRawRows, isPeak, loadPricing } from '../src/cost/cost.js';

const pricing = loadPricing();
const MODELS = JSON.parse(fs.readFileSync(new URL('../config/models.json', import.meta.url), 'utf8'));
const MODEL = Object.fromEntries(MODELS.models.map((m) => [m.id, m]));
const PROBE = readRawRows(new URL('../results/raw/2026-11-03-probe.jsonl', import.meta.url));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} ≠ ${b}`);

// A raw row of the given model with the given usage (tsStartUtc: a Tuesday, off-peak by default).
function row(modelId, usage, { usageRaw = {}, tsStartUtc = '2026-11-03T11:00:00.000Z' } = {}) {
  return buildRawRow({
    runId: 'r', taskId: 'K1-001', model: MODEL[modelId], repeat: 1, tsStartUtc,
    result: { text: 'x', modelVersion: 'v', finishReason: 'stop', ttftMs: 1, totalMs: 2, usageRaw,
      usage: { cachedInput: null, reasoning: null, ...usage } },
  });
}

describe('config/pricing.json', () => {
  test('every model in models.json has a price with the same model name, in USD per 1M tokens', () => {
    assert.equal(pricing.currency, 'USD');
    assert.equal(pricing.unit, 'per 1M tokens');
    assert.match(pricing.priceListDate, /^\d{4}-\d{2}-\d{2}$/);
    for (const m of MODELS.models) {
      assert.ok(pricing.models[m.id], m.id);
      assert.equal(pricing.models[m.id].model, m.model, m.id);
      assert.match(pricing.models[m.id].source, /^https:\/\//, m.id);
    }
  });

  test('the prices of PLAN.md (1.11.2026), unchanged on 3.11.2026', () => {
    const p = pricing.models;
    assert.deepEqual([p.openai.input, p.openai.output, p.openai.cachedInput], [1, 5, 0.05]);
    assert.deepEqual([p.anthropic.input, p.anthropic.output], [2, 10]);
    assert.deepEqual([p.google.input, p.google.output], [0.75, 3.75]);
    assert.deepEqual(p.deepseek.peak, { input: 0.30, cachedInput: 0.006, output: 1.20 });
    assert.deepEqual([p.xai.input, p.xai.output], [2, 6]);
  });

  test('DeepSeek off-peak is half of peak; peak hours Mon–Fri 01–04 and 06–10 UTC', () => {
    const { peak, offPeak, peakHoursUtc } = pricing.models.deepseek;
    for (const k of Object.keys(peak)) close(offPeak[k], peak[k] / 2);
    assert.deepEqual(peakHoursUtc, { weekdays: [1, 2, 3, 4, 5], hours: [[1, 4], [6, 10]] });
  });
});

describe('DeepSeek peak hours (by tsStartUtc)', () => {
  const { peakHoursUtc } = pricing.models.deepseek;
  // 2026-11-02 is a Monday.
  const cases = [
    ['2026-11-02T00:59:59.999Z', false],
    ['2026-11-02T01:00:00.000Z', true],
    ['2026-11-02T03:59:59.999Z', true],
    ['2026-11-02T04:00:00.000Z', false],
    ['2026-11-02T05:59:59.999Z', false],
    ['2026-11-02T06:00:00.000Z', true],
    ['2026-11-02T09:59:59.999Z', true],
    ['2026-11-02T10:00:00.000Z', false],
    ['2026-11-06T08:00:00.000Z', true], // Friday
    ['2026-11-07T02:00:00.000Z', false], // Saturday
    ['2026-11-08T07:00:00.000Z', false], // Sunday
  ];
  for (const [ts, peak] of cases) {
    test(`${ts} → ${peak ? 'peak' : 'off-peak'}`, () => assert.equal(isPeak(ts, peakHoursUtc), peak));
  }

  test('a date in offPeakDates (Chinese public holiday) is off-peak all day', () => {
    assert.equal(isPeak('2026-11-02T02:00:00.000Z', peakHoursUtc, ['2026-11-02']), false);
    assert.equal(isPeak('2026-11-03T02:00:00.000Z', peakHoursUtc, ['2026-11-02']), true);
  });

  test('the price follows the request time, in both sums', () => {
    const usage = { input: 1_000_000, cachedInput: 400_000, output: 1_000_000 };
    const raw = { prompt_cache_hit_tokens: 400_000 };
    const peak = computeCost(row('deepseek', usage, { usageRaw: raw, tsStartUtc: '2026-11-02T01:00:00.000Z' }), pricing);
    const off = computeCost(row('deepseek', usage, { usageRaw: raw, tsStartUtc: '2026-11-02T00:59:59.999Z' }), pricing);
    assert.equal(peak.period, 'peak');
    assert.equal(off.period, 'offPeak');
    close(peak.costCriterion, 0.30 + 1.20);
    close(peak.costBilled, 0.6 * 0.30 + 0.4 * 0.006 + 1.20);
    close(off.costCriterion, (0.30 + 1.20) / 2);
    close(off.costBilled, (0.6 * 0.30 + 0.4 * 0.006 + 1.20) / 2);
  });
});

describe('the two sums', () => {
  test('costCriterion: all input at full price as if every request were new; costBilled: cache at the cache price', () => {
    // OpenAI: 100k input of which 60k from cache, 20k output.
    const c = computeCost(row('openai', { input: 100_000, cachedInput: 60_000, output: 20_000 }), pricing);
    close(c.costCriterion, (100_000 * 1.00 + 20_000 * 5.00) / 1e6);
    close(c.costBilled, (40_000 * 1.00 + 60_000 * 0.05 + 20_000 * 5.00) / 1e6);
  });

  test('reasoning tokens are output: the output count already includes them', () => {
    // Gemini: output = candidates + thoughts (the adapter's normalization), here 100 + 900.
    const c = computeCost(row('google', { input: 0, output: 1000, reasoning: 900 }), pricing);
    close(c.costCriterion, 1000 * 3.75 / 1e6);
  });

  test('Anthropic: cache writes at the 5-minute and 1-hour write prices in costBilled only', () => {
    const usageRaw = {
      input_tokens: 100_000, cache_read_input_tokens: 300_000, cache_creation_input_tokens: 600_000,
      cache_creation: { ephemeral_5m_input_tokens: 400_000, ephemeral_1h_input_tokens: 200_000 },
    };
    const c = computeCost(row('anthropic', { input: 1_000_000, cachedInput: 300_000, output: 0 }, { usageRaw }), pricing);
    close(c.costCriterion, 2.00);
    close(c.costBilled, 0.1 * 2.00 + 0.3 * 0.10 + 0.4 * 2.50 + 0.2 * 4.00);
    assert.deepEqual(cacheWrites(usageRaw), { total: 600_000, ttl5m: 400_000, ttl1h: 200_000 });
  });

  test('OpenAI: cache_write_tokens at the 30-minute write price', () => {
    const usageRaw = { prompt_tokens: 100_000, prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 50_000 } };
    const c = computeCost(row('openai', { input: 100_000, cachedInput: 0, output: 0 }, { usageRaw }), pricing);
    close(c.costBilled, (50_000 * 1.00 + 50_000 * 1.25) / 1e6);
    close(c.costCriterion, 100_000 * 1.00 / 1e6);
  });

  test('no cache (cachedInput null) → both sums are equal', () => {
    const c = computeCost(row('google', { input: 54, cachedInput: null, output: 509 }), pricing);
    assert.equal(c.costCriterion, c.costBilled);
  });

  test('no usage from the provider → null, not 0', () => {
    assert.equal(computeCost(row('openai', { input: null, output: null }), pricing), null);
  });
});

describe('prices that do not apply are errors', () => {
  test('Gemini after its introductory price (validUntil 2026-12-31)', () => {
    assert.ok(computeCost(row('google', { input: 1, output: 1 }, { tsStartUtc: '2026-12-31T23:59:59.999Z' }), pricing));
    assert.throws(() => computeCost(row('google', { input: 1, output: 1 }, { tsStartUtc: '2027-01-01T00:00:00.000Z' }), pricing), /valid until/);
  });

  test('a prompt in the long-context price band (xAI from 200K, OpenAI above 272K)', () => {
    assert.ok(computeCost(row('xai', { input: 199_999, output: 1 }), pricing));
    assert.throws(() => computeCost(row('xai', { input: 200_000, output: 1 }), pricing), /above the priced context/);
    assert.throws(() => computeCost(row('openai', { input: 272_001, output: 1 }), pricing), /above the priced context/);
  });

  test('a non-standard service tier or regional inference', () => {
    assert.throws(() => computeCost(row('anthropic', { input: 1, output: 1 }, { usageRaw: { inference_geo: 'us' } }), pricing), /inference_geo/);
    assert.throws(() => computeCost(row('anthropic', { input: 1, output: 1 }, { usageRaw: { speed: 'fast' } }), pricing), /speed/);
    assert.throws(() => computeCost(row('google', { input: 1, output: 1 }, { usageRaw: { serviceTier: 'priority' } }), pricing), /serviceTier/);
  });

  test('an unknown model or a model name that does not match pricing.json', () => {
    assert.throws(() => computeCost({ ...row('openai', { input: 1, output: 1 }), modelId: 'x' }, pricing), /no price/);
    assert.throws(() => computeCost({ ...row('openai', { input: 1, output: 1 }), modelRequested: 'gpt-7' }, pricing), /pricing.json has/);
  });

  test('more cached input than input', () => {
    assert.throws(() => computeCost(row('openai', { input: 10, cachedInput: 20, output: 0 }), pricing), /exceed the input/);
  });
});

describe('the probe rows of 3.11.2026', () => {
  const costs = Object.fromEntries(PROBE.map((r) => [r.modelId, computeCost(r, pricing)]));

  test('xAI: costBilled equals the cost that xAI itself reported (cost_in_usd_ticks, 1 tick = 1e-10 USD)', () => {
    const xai = PROBE.find((r) => r.modelId === 'xai');
    close(costs.xai.costBilled, xai.usageRaw.cost_in_usd_ticks / 1e10);
    // 1294 input (1152 from cache), 333 output: 142 × 2 + 1152 × 0.50 + 333 × 6 per 1M.
    close(costs.xai.costBilled, (142 * 2 + 1152 * 0.5 + 333 * 6) / 1e6);
    close(costs.xai.costCriterion, (1294 * 2 + 333 * 6) / 1e6);
  });

  test('the other four, by hand (DeepSeek at 11:19 UTC on a Tuesday: off-peak)', () => {
    close(costs.openai.costBilled, (54 * 1 + 7 * 5) / 1e6);
    close(costs.anthropic.costBilled, (89 * 2 + 8 * 10) / 1e6);
    close(costs.google.costBilled, (54 * 0.75 + 509 * 3.75) / 1e6);
    assert.equal(costs.deepseek.period, 'offPeak');
    close(costs.deepseek.costBilled, (89 * 0.15 + 91 * 0.60) / 1e6);
  });
});

describe('cost rows', () => {
  test('one row per ok raw row with key, costCriterion, costBilled; error rows are skipped', () => {
    const error = buildRawRow({
      runId: 'r', taskId: 'K1-002', model: MODEL.openai, repeat: 1, tsStartUtc: '2026-11-03T11:00:00.000Z',
      error: new ApiError('Overloaded', { status: 529, retryable: true }),
    });
    const { rows, skippedErrors, missingUsage } = costRawRows([...PROBE, error, row('openai', { input: null, output: null })], pricing);
    assert.equal(skippedErrors, 1);
    assert.equal(missingUsage, 1);
    assert.equal(rows.length, 6);
    assert.deepEqual(Object.keys(rows[0]), ['key', 'costCriterion', 'costBilled']);
    assert.deepEqual(rows[5], { key: 'r|K1-001|openai|1', costCriterion: null, costBilled: null });
  });
});
