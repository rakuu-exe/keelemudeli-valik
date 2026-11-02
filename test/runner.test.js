// Konveieri põhiosa testid võltsadapteriga: toorrea kuju, järjekord ja jätkamine.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { looAdapter, ApiViga } from '../src/adapters/index.js';
import { laePank, kasutajasonum } from '../src/pank.js';
import { koostaPlaan, kaivita, usageKlapib } from '../src/runner/run.js';
import { looToorrida, loeToorread, toorreaVoti } from '../src/runner/toorrida.js';

const pank = laePank();
const MUDELID = JSON.parse(fs.readFileSync(new URL('../config/models.json', import.meta.url), 'utf8'));
const TOORREA_VALJAD = [
  'key', 'runId', 'taskId', 'modelId', 'modelRequested', 'modelVersion', 'kordus', 'tsStartUtc',
  'ttftMs', 'totalMs', 'status', 'error', 'finishReason', 'usage', 'usageRaw', 'text',
];

const ajutineFail = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'konveier-')), 'raw.jsonl');
const voltsAdapterid = (plaan, valikud = {}) =>
  new Map(plaan.mudelid.map((m) => [m.id, looAdapter({ ...m, adapter: 'fake' }, valikud)]));

describe('toorrida', () => {
  const mudel = MUDELID.models[0];
  const alus = { runId: 'r', taskId: 'K2-026', mudel, kordus: 3, tsStartUtc: '2026-11-02T10:00:00.000Z' };

  test('võti ja väljad CLAUDE.md järgi (+ usageRaw)', () => {
    const tulemus = {
      text: ' Tallinn\n', modelVersion: 'v', finishReason: 'stop', ttftMs: 1.5, totalMs: 2.5,
      usage: { input: 1, cachedInput: null, output: 2, reasoning: null }, usageRaw: { a: 1 },
    };
    const rida = looToorrida({ ...alus, tulemus });
    assert.deepEqual(Object.keys(rida), TOORREA_VALJAD);
    assert.equal(rida.key, 'r|K2-026|openai|3');
    assert.equal(rida.modelRequested, 'gpt-6.1-terra');
    assert.equal(rida.status, 'ok');
    assert.equal(rida.text, ' Tallinn\n'); // toorvastust ei puhastata
  });

  test('veaga rida: status error, vastuse väljad null', () => {
    const rida = looToorrida({ ...alus, viga: new ApiViga('Rate limit', { status: 429, korratav: true }) });
    assert.deepEqual(Object.keys(rida), TOORREA_VALJAD);
    assert.equal(rida.status, 'error');
    assert.deepEqual(rida.error, { httpStatus: 429, message: 'Rate limit' });
    assert.equal(rida.text, null);
    assert.equal(rida.usage, null);
  });
});

describe('konveier', () => {
  const jooks = { runId: 'test', models: ['openai', 'anthropic', 'google'], tasks: ['K1-001', 'K2-001'], repeats: 2 };

  test('ringid: välimine kordus, sisemine ülesanded × mudelid', () => {
    const plaan = koostaPlaan(jooks, MUDELID, pank);
    assert.equal(plaan.paringud.length, 2 * 2 * 3);
    assert.deepEqual(
      plaan.paringud.slice(0, 7).map((p) => `${p.kordus}|${p.ulesanne.id}|${p.mudel.id}`),
      [
        '1|K1-001|openai', '1|K1-001|anthropic', '1|K1-001|google',
        '1|K2-001|openai', '1|K2-001|anthropic', '1|K2-001|google',
        '2|K1-001|openai',
      ],
    );
  });

  test('"all" = kõik 120 ülesannet; tundmatu mudel või ülesanne → viga', () => {
    assert.equal(koostaPlaan({ ...jooks, tasks: 'all', repeats: 1 }, MUDELID, pank).paringud.length, 120 * 3);
    assert.throws(() => koostaPlaan({ ...jooks, models: ['puudub'] }, MUDELID, pank), /puudub/);
    assert.throws(() => koostaPlaan({ ...jooks, tasks: ['K9-999'] }, MUDELID, pank), /K9-999/);
  });

  test('iga päring salvestatakse; adapter saab malli järgi koostatud kasutajasõnumi', async () => {
    const fail = ajutineFail();
    const plaan = koostaPlaan(jooks, MUDELID, pank);
    const saadetud = [];
    const adapterid = voltsAdapterid(plaan, { vastus: (sonum) => (saadetud.push(sonum), 'Tallinn') });
    await kaivita({ jooks, plaan, pank, valjundFail: fail, adapterid });

    const read = loeToorread(fail);
    assert.equal(read.length, 12);
    assert.equal(new Set(read.map((r) => r.key)).size, 12);
    assert.ok(read.every((r) => r.status === 'ok' && r.text === 'Tallinn'));
    const k1 = pank['ülesanded'].find((u) => u.id === 'K1-001');
    assert.equal(saadetud[0], kasutajasonum(k1, pank));
  });

  test('katkestatud jooks jätkub duplikaatideta', async () => {
    const fail = ajutineFail();
    const plaan = koostaPlaan(jooks, MUDELID, pank);
    // Esimene käivitus katkeb 5. päringu juures (nt protsess suletakse).
    let n = 0;
    const katkev = new Map(plaan.mudelid.map((m) => [m.id, async (sonum) => {
      if (++n === 5) throw new Error('katkestus');
      return looAdapter({ ...m, adapter: 'fake' })(sonum);
    }]));
    await assert.rejects(kaivita({ jooks, plaan, pank, valjundFail: fail, adapterid: katkev }), /katkestus/);
    assert.equal(loeToorread(fail).length, 4);

    const lisatud = await kaivita({ jooks, plaan, pank, valjundFail: fail, adapterid: voltsAdapterid(plaan) });
    assert.equal(lisatud.length, 8);
    const read = loeToorread(fail);
    assert.equal(read.length, 12);
    assert.equal(new Set(read.map((r) => r.key)).size, 12);

    const kolmas = await kaivita({ jooks, plaan, pank, valjundFail: fail, adapterid: voltsAdapterid(plaan) });
    assert.equal(kolmas.length, 0);
  });

  test('API viga → veaga rida, jooks jätkub', async () => {
    const fail = ajutineFail();
    const plaan = koostaPlaan({ ...jooks, repeats: 1 }, MUDELID, pank);
    const adapterid = voltsAdapterid(plaan, {
      viga: (_, m) => (m.id === 'google' ? new ApiViga('Bad request', { status: 400 }) : null),
    });
    await kaivita({ jooks: { ...jooks, repeats: 1 }, plaan, pank, valjundFail: fail, adapterid });
    const read = loeToorread(fail);
    assert.equal(read.length, 6);
    assert.deepEqual(read.filter((r) => r.status === 'error').map((r) => r.key), [
      toorreaVoti({ runId: 'test', taskId: 'K1-001', modelId: 'google', kordus: 1 }),
      toorreaVoti({ runId: 'test', taskId: 'K2-001', modelId: 'google', kordus: 1 }),
    ]);
  });

  test('olemasolevad read jäävad muutmata (fail ainult kasvab)', async () => {
    const fail = ajutineFail();
    const plaan = koostaPlaan({ ...jooks, repeats: 1 }, MUDELID, pank);
    await kaivita({ jooks, plaan: { ...plaan, paringud: plaan.paringud.slice(0, 2) }, pank, valjundFail: fail, adapterid: voltsAdapterid(plaan) });
    const enne = fs.readFileSync(fail, 'utf8');
    await kaivita({ jooks, plaan, pank, valjundFail: fail, adapterid: voltsAdapterid(plaan) });
    assert.ok(fs.readFileSync(fail, 'utf8').startsWith(enne));
  });
});

describe('usageKlapib', () => {
  test('OpenAI-ühilduv total_tokens ja Gemini totalTokenCount', () => {
    assert.equal(usageKlapib({ usage: { input: 32, output: 103 }, usageRaw: { total_tokens: 135 } }), true);
    assert.equal(usageKlapib({ usage: { input: 32, output: 9 }, usageRaw: { total_tokens: 135 } }), false);
    assert.equal(usageKlapib({ usage: { input: 214, output: 57 }, usageRaw: { totalTokenCount: 271 } }), true);
    assert.equal(usageKlapib({ usage: { input: 1, output: 2 }, usageRaw: { input_tokens: 1 } }), null);
  });
});
