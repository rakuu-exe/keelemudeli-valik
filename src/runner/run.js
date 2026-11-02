// Mõõtmiskonveier: saadab jooksu seadistuses nimetatud ülesanded mudelitele ja salvestab
// iga päringu toorreana faili results/raw/<runId>.jsonl.
//
//   node src/runner/run.js --config config/run.proov.json
//
// Järjekord: välimine tsükkel on kordus, sisemine ülesanded × mudelid [M7].
// Juba salvestatud võtmeid ei korrata, nii et katkenud jooksu saab uuesti käivitada.
// Korduskatsed vigade korral, --dry-run ja --limit lisanduvad faasis 2.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config as laeEnv } from 'dotenv';
import { looAdapter, ApiViga } from '../adapters/index.js';
import { laePank, kasutajasonum } from '../pank.js';
import { looToorrida, lisaToorrida, olemasolevadVotmed, toorreaVoti } from './toorrida.js';

export const JUUR = new URL('../../', import.meta.url);
const loeJson = (url) => JSON.parse(fs.readFileSync(url, 'utf8'));

// Jooksu seadistus: { runId, description, models: [id...], tasks: "all" | [id...], repeats }
export function koostaPlaan(jooks, mudeliSeadistus, pank) {
  if (!/^[\w.-]+$/.test(jooks.runId ?? '')) throw new Error(`Vigane runId: ${jooks.runId}`);
  if (!Number.isInteger(jooks.repeats) || jooks.repeats < 1) throw new Error('repeats peab olema positiivne täisarv');

  const koikMudelid = new Map(mudeliSeadistus.models.map((m) => [m.id, m]));
  const mudelid = jooks.models.map((id) => {
    const m = koikMudelid.get(id);
    if (!m) throw new Error(`Mudelit "${id}" pole failis config/models.json`);
    return m;
  });

  const koikUlesanded = new Map(pank['ülesanded'].map((u) => [u.id, u]));
  const ulesanded = jooks.tasks === 'all'
    ? pank['ülesanded']
    : jooks.tasks.map((id) => {
      const u = koikUlesanded.get(id);
      if (!u) throw new Error(`Ülesannet "${id}" pole ülesandepangas`);
      return u;
    });

  const paringud = [];
  for (let kordus = 1; kordus <= jooks.repeats; kordus++) {
    for (const ulesanne of ulesanded) {
      for (const mudel of mudelid) paringud.push({ kordus, ulesanne, mudel });
    }
  }
  return { mudelid, paringud };
}

// adapterid: Map mudeli id → saada(sonum). Tagastab selles jooksus lisatud read.
export async function kaivita({ jooks, plaan, pank, valjundFail, adapterid, logi = () => {} }) {
  const olemas = olemasolevadVotmed(valjundFail);
  const lisatud = [];
  for (const { kordus, ulesanne, mudel } of plaan.paringud) {
    const alus = { runId: jooks.runId, taskId: ulesanne.id, mudel, kordus };
    if (olemas.has(toorreaVoti({ ...alus, modelId: mudel.id }))) continue;

    const sonum = kasutajasonum(ulesanne, pank);
    const tsStartUtc = new Date().toISOString();
    let rida;
    try {
      rida = looToorrida({ ...alus, tsStartUtc, tulemus: await adapterid.get(mudel.id)(sonum) });
    } catch (e) {
      if (!(e instanceof ApiViga)) throw e;
      rida = looToorrida({ ...alus, tsStartUtc, viga: e });
    }
    lisaToorrida(valjundFail, rida);
    lisatud.push(rida);
    logi(rida);
  }
  return lisatud;
}

// Normaliseerimise kontroll: kui pakkuja annab kogusumma, peab input + output sellega klappima.
export function usageKlapib(rida) {
  const kokku = rida.usageRaw?.total_tokens ?? rida.usageRaw?.totalTokenCount;
  if (typeof kokku !== 'number' || rida.usage?.input == null || rida.usage?.output == null) return null;
  return rida.usage.input + rida.usage.output === kokku;
}

function reaKokkuvote(r) {
  if (r.status === 'error') return `${r.key}  VIGA ${r.error.httpStatus ?? '-'}: ${r.error.message}`;
  const u = r.usage;
  const klapib = usageKlapib(r);
  return [
    r.key,
    `mudel=${r.modelVersion}`,
    `finish=${r.finishReason}`,
    `ttft=${r.ttftMs === null ? '-' : r.ttftMs.toFixed(0)}ms`,
    `kokku=${r.totalMs.toFixed(0)}ms`,
    `tokenid in=${u.input} cache=${u.cachedInput} out=${u.output} mõtlemine=${u.reasoning}`,
    klapib === null ? '' : `summa ${klapib ? 'klapib' : 'EI KLAPI'}`,
    `tekst=${JSON.stringify(r.text.length > 60 ? r.text.slice(0, 60) + '…' : r.text)}`,
  ].filter(Boolean).join('  ');
}

async function main() {
  const i = process.argv.indexOf('--config');
  if (i === -1 || !process.argv[i + 1]) {
    console.error('Kasutus: node src/runner/run.js --config config/run.<nimi>.json');
    process.exit(2);
  }
  // Võtmed loetakse ainult .env failist, mitte süsteemi keskkonnast: nii ei saa juhuslikult
  // kasutada mõnda muud (nt isiklikku) võtit ja hinnaarvutuse kontroll klapib [PK9].
  const votmed = {};
  laeEnv({ path: fileURLToPath(new URL('.env', JUUR)), quiet: true, processEnv: votmed });

  const jooks = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const mudeliSeadistus = loeJson(new URL('config/models.json', JUUR));
  const pank = laePank();
  const plaan = koostaPlaan(jooks, mudeliSeadistus, pank);
  const adapterid = new Map(
    plaan.mudelid.map((m) => [m.id, looAdapter(m, { env: votmed, maxValjund: mudeliSeadistus.maxOutputTokens })]),
  );
  const valjundFail = fileURLToPath(new URL(`results/raw/${jooks.runId}.jsonl`, JUUR));

  console.log(`${jooks.runId}: ${plaan.paringud.length} päringut plaanis → ${valjundFail}`);
  const lisatud = await kaivita({ jooks, plaan, pank, valjundFail, adapterid, logi: (r) => console.log(reaKokkuvote(r)) });
  const vigu = lisatud.filter((r) => r.status === 'error').length;
  console.log(`Valmis: ${lisatud.length} uut rida, neist vigu ${vigu}. Vahele jäeti ${plaan.paringud.length - lisatud.length} juba olemasolevat.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
