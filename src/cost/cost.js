// Cost (PLAN.md phase 4, [M4]): two sums in USD for every ok raw row, from the stored usage and
// config/pricing.json.
//
//   node src/cost/cost.js --run <runId> [--dry-run]
//     reads  results/raw/<runId>.jsonl
//     writes results/cost/<runId>.jsonl: { key, costCriterion, costBilled }
//
//   costCriterion = all input at the full input price (as if every request were new)
//                   + all output, reasoning included, at the output price       → WSM
//   costBilled    = input read from cache at the cache price, input written to cache at the
//                   cache write price (where the provider bills it), the rest at the input price,
//                   + all output at the output price                           → billing check [PK9]
//
// The DeepSeek price (peak or off-peak) is chosen by tsStartUtc. A price that does not apply to a
// row (a date after validUntil, a prompt above maxInputTokens, a non-standard service tier) is an
// error, not a silent wrong number. Error rows have no usage and get no cost row. The file is
// derived and written again on every run.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readRawRows } from '../runner/rawRows.js';
import { writeJsonl } from '../checkers/score.js';
import { costFile, rawFile, ROOT } from '../paths.js';

const PER_TOKENS = 1_000_000;
const round = (x) => Math.round(x * 1e12) / 1e12;

export const loadPricing = () => JSON.parse(fs.readFileSync(new URL('config/pricing.json', ROOT), 'utf8'));

// Is the time inside the DeepSeek peak hours? hours [from, to): the start hour is included, the end
// hour is not (01:00–04:00 → 01:00:00.000 … 03:59:59.999). offPeakDates (YYYY-MM-DD, UTC) are
// off-peak in full.
export function isPeak(tsStartUtc, peakHoursUtc, offPeakDates = []) {
  const d = new Date(tsStartUtc);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid tsStartUtc: ${tsStartUtc}`);
  if (offPeakDates.includes(d.toISOString().slice(0, 10))) return false;
  if (!peakHoursUtc.weekdays.includes(d.getUTCDay())) return false;
  const hour = d.getUTCHours();
  return peakHoursUtc.hours.some(([from, to]) => hour >= from && hour < to);
}

// The prices that apply to one row, per 1M tokens.
export function pricesFor(entry, row) {
  if (entry.validUntil && row.tsStartUtc.slice(0, 10) > entry.validUntil) {
    throw new Error(`${row.key}: the price of ${entry.model} is valid until ${entry.validUntil} (request ${row.tsStartUtc})`);
  }
  if (entry.peak) {
    const peak = isPeak(row.tsStartUtc, entry.peakHoursUtc, entry.offPeakDates);
    return { ...(peak ? entry.peak : entry.offPeak), period: peak ? 'peak' : 'offPeak' };
  }
  return { ...entry, period: null };
}

// Input written to cache, from the provider's own usage object: Anthropic
// cache_creation_input_tokens (by TTL in cache_creation), OpenAI prompt_tokens_details.cache_write_tokens.
export function cacheWrites(usageRaw) {
  const u = usageRaw ?? {};
  if (typeof u.cache_creation_input_tokens === 'number' && u.cache_creation_input_tokens > 0) {
    const c = u.cache_creation ?? {};
    const h1 = c.ephemeral_1h_input_tokens ?? 0;
    return { total: u.cache_creation_input_tokens, ttl5m: u.cache_creation_input_tokens - h1, ttl1h: h1 };
  }
  const openai = u.prompt_tokens_details?.cache_write_tokens;
  if (typeof openai === 'number' && openai > 0) return { total: openai, ttl5m: 0, ttl1h: 0 };
  return { total: 0, ttl5m: 0, ttl1h: 0 };
}

// The prices are for the standard service tier with global inference; anything else in the
// provider's usage object would make them wrong.
function checkTier(row) {
  const u = row.usageRaw ?? {};
  for (const field of ['service_tier', 'serviceTier', 'speed']) {
    if (u[field] !== undefined && u[field] !== 'standard') throw new Error(`${row.key}: ${field} "${u[field]}" is not priced`);
  }
  if (u.inference_geo !== undefined && u.inference_geo !== 'global') {
    throw new Error(`${row.key}: inference_geo "${u.inference_geo}" is not priced`);
  }
}

// Returns { costCriterion, costBilled, period } in USD, or null if the provider sent no usage.
export function computeCost(row, pricing) {
  const entry = pricing.models[row.modelId];
  if (!entry) throw new Error(`${row.key}: no price for model "${row.modelId}" in config/pricing.json`);
  if (entry.model !== row.modelRequested) {
    throw new Error(`${row.key}: pricing.json has ${entry.model}, the row requested ${row.modelRequested}`);
  }
  const u = row.usage;
  if (!u || u.input === null || u.output === null) return null;
  if (entry.maxInputTokens && u.input > entry.maxInputTokens) {
    throw new Error(`${row.key}: ${u.input} input tokens is above the priced context (${entry.maxInputTokens})`);
  }
  checkTier(row);
  const price = pricesFor(entry, row);
  const cached = u.cachedInput ?? 0;
  const writes = cacheWrites(row.usageRaw);
  let writeCost = 0;
  if (writes.total > 0) {
    if (price.cacheWrite5m !== undefined) writeCost = writes.ttl5m * price.cacheWrite5m + writes.ttl1h * price.cacheWrite1h;
    else if (price.cacheWrite !== undefined) writeCost = writes.total * price.cacheWrite;
    else throw new Error(`${row.key}: ${writes.total} cache write tokens, but no cache write price`);
  }
  const fresh = u.input - cached - writes.total;
  if (fresh < 0) throw new Error(`${row.key}: cached and written input (${cached + writes.total}) exceed the input (${u.input})`);
  return {
    costCriterion: round((u.input * price.input + u.output * price.output) / PER_TOKENS),
    costBilled: round((fresh * price.input + cached * price.cachedInput + writeCost + u.output * price.output) / PER_TOKENS),
    period: price.period,
  };
}

// Returns { rows, skippedErrors, missingUsage }. A row whose provider sent no usage gets nulls.
export function costRawRows(rawRows, pricing) {
  const rows = [];
  let skippedErrors = 0;
  let missingUsage = 0;
  const details = [];
  for (const raw of rawRows) {
    if (raw.status === 'error') {
      skippedErrors++;
      continue;
    }
    const cost = computeCost(raw, pricing);
    if (!cost) missingUsage++;
    rows.push({ key: raw.key, costCriterion: cost?.costCriterion ?? null, costBilled: cost?.costBilled ?? null });
    details.push({ modelId: raw.modelId, ...cost });
  }
  return { rows, skippedErrors, missingUsage, details };
}

function summarize(details) {
  const byModel = new Map();
  for (const d of details) {
    if (!byModel.has(d.modelId)) byModel.set(d.modelId, []);
    byModel.get(d.modelId).push(d);
  }
  const lines = ['model        rows   costBilled  costCriterion  criterion/request  peak'];
  for (const [modelId, ds] of byModel) {
    const priced = ds.filter((d) => d.costCriterion !== undefined);
    const sum = (f) => priced.reduce((a, d) => a + d[f], 0);
    const peak = ds.some((d) => d.period) ? String(ds.filter((d) => d.period === 'peak').length) : '-';
    lines.push([
      modelId.padEnd(12), String(ds.length).padStart(4), sum('costBilled').toFixed(6).padStart(12),
      sum('costCriterion').toFixed(6).padStart(14), (priced.length ? sum('costCriterion') / priced.length : 0).toFixed(8).padStart(18),
      peak.padStart(5),
    ].join(' '));
  }
  return lines.join('\n');
}

function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { run: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
  });
  if (!values.run || !/^[\w.-]+$/.test(values.run)) {
    console.error('Usage: node src/cost/cost.js --run <runId> [--dry-run]');
    process.exit(2);
  }
  const options = { dryRun: values['dry-run'] };
  const input = rawFile(values.run, options);
  if (!fs.existsSync(input)) throw new Error(`No raw rows: ${input}`);
  const pricing = loadPricing();
  const { rows, skippedErrors, missingUsage, details } = costRawRows(readRawRows(input), pricing);
  const output = costFile(values.run, options);
  writeJsonl(output, rows);
  console.log(`${values.run}: ${rows.length} cost rows → ${output} (prices of ${pricing.priceListDate}; ${skippedErrors} error rows skipped)`);
  if (missingUsage) console.log(`${missingUsage} rows have no usage from the provider (cost null)`);
  console.log(summarize(details));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
