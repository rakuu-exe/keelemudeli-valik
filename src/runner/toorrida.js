// Toorread: üks rida = üks API-päring (CLAUDE.md, „Toorrida“). Fail ainult kasvab.
import fs from 'node:fs';
import path from 'node:path';

export const toorreaVoti = ({ runId, taskId, modelId, kordus }) => `${runId}|${taskId}|${modelId}|${kordus}`;

// tulemus = adapteri tulemus (status ok) või viga = ApiViga (status error).
export function looToorrida({ runId, taskId, mudel, kordus, tsStartUtc, tulemus = null, viga = null }) {
  if ((tulemus === null) === (viga === null)) throw new Error('Toorreal peab olema kas tulemus või viga');
  const alus = {
    key: toorreaVoti({ runId, taskId, modelId: mudel.id, kordus }),
    runId,
    taskId,
    modelId: mudel.id,
    modelRequested: mudel.model,
  };
  if (viga) {
    return {
      ...alus,
      modelVersion: null,
      kordus,
      tsStartUtc,
      ttftMs: null,
      totalMs: null,
      status: 'error',
      error: { httpStatus: viga.status ?? null, message: viga.message },
      finishReason: null,
      usage: null,
      usageRaw: null,
      text: null,
    };
  }
  return {
    ...alus,
    modelVersion: tulemus.modelVersion,
    kordus,
    tsStartUtc,
    ttftMs: tulemus.ttftMs,
    totalMs: tulemus.totalMs,
    status: 'ok',
    error: null,
    finishReason: tulemus.finishReason,
    usage: tulemus.usage,
    usageRaw: tulemus.usageRaw,
    text: tulemus.text, // täpselt nii, nagu API tagastas
  };
}

export function lisaToorrida(fail, rida) {
  fs.mkdirSync(path.dirname(fail), { recursive: true });
  fs.appendFileSync(fail, JSON.stringify(rida) + '\n', 'utf8');
}

export function loeToorread(fail) {
  if (!fs.existsSync(fail)) return [];
  return fs
    .readFileSync(fail, 'utf8')
    .split('\n')
    .filter((rida) => rida.trim() !== '')
    .map((rida, i) => {
      try {
        return JSON.parse(rida);
      } catch {
        throw new Error(`${fail}: rida ${i + 1} ei ole korrektne JSON`);
      }
    });
}

export const olemasolevadVotmed = (fail) => new Set(loeToorread(fail).map((r) => r.key));
