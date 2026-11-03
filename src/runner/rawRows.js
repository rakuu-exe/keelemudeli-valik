// Raw rows: one row = one API request (CLAUDE.md, "Raw row"). The file only grows.
import fs from 'node:fs';
import path from 'node:path';

export const rawRowKey = ({ runId, taskId, modelId, repeat }) => `${runId}|${taskId}|${modelId}|${repeat}`;

// result = adapter result (status ok) or error = ApiError (status error).
// retries = earlier failed attempts of the same request: [{ tsStartUtc, httpStatus, message }].
export function buildRawRow({ runId, taskId, model, repeat, tsStartUtc, retries = [], result = null, error = null }) {
  if ((result === null) === (error === null)) throw new Error('A raw row needs either a result or an error');
  const base = {
    key: rawRowKey({ runId, taskId, modelId: model.id, repeat }),
    runId,
    taskId,
    modelId: model.id,
    modelRequested: model.model,
  };
  if (error) {
    return {
      ...base,
      modelVersion: null,
      repeat,
      tsStartUtc,
      ttftMs: null,
      totalMs: null,
      status: 'error',
      error: { httpStatus: error.status ?? null, message: error.message },
      retries,
      finishReason: null,
      usage: null,
      usageRaw: null,
      text: null,
    };
  }
  return {
    ...base,
    modelVersion: result.modelVersion,
    repeat,
    tsStartUtc,
    ttftMs: result.ttftMs,
    totalMs: result.totalMs,
    status: 'ok',
    error: null,
    retries,
    finishReason: result.finishReason,
    usage: result.usage,
    usageRaw: result.usageRaw,
    text: result.text, // exactly as returned by the API
  };
}

export function appendRawRow(file, row) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(row) + '\n', 'utf8');
}

export function readRawRows(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`${file}: line ${i + 1} is not valid JSON`);
      }
    });
}

export const existingKeys = (file) => new Set(readRawRows(file).map((r) => r.key));
