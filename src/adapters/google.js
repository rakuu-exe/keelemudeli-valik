// Google Gemini API (@google/genai).
//
// Saadetakse ainult mudel, kasutajasõnum ja maxOutputTokens. Mõtlemistaset ei määrata
// (pakkuja vaikeseadistus). Mõtteid vastuses ei tagastata, sest includeThoughts jääb määramata.
//
// SDK valikud, mis API-le ei lähe, aga on mõõtmiseks vajalikud:
//  - automaticContinuation: false: muidu võib SDK finishReason CONTINUATION korral teha
//    sama toorrea all uusi arveldatavaid päringuid. Toorrida = üks API-päring.
//  - retryOptions.attempts: 1: korduskatsed teeb konveier (faas 2), mitte SDK.
import { ApiError, GoogleGenAI } from '@google/genai';
import { apiVoti, kell as vaikeKell, taisarv, teisendaViga } from './yhine.js';

// fetch'i võrguvead (ühendus katkes, striim lõppes enneaegu, ajalõpp) on samuti API vead.
const onApiViga = (e) =>
  e instanceof ApiError ||
  e?.name === 'AbortError' ||
  e?.name === 'TimeoutError' ||
  (e instanceof TypeError && /fetch failed|terminated|network/i.test(e.message));

export function looGoogle(mudel, { env = {}, maxValjund, fetch, kell = vaikeKell } = {}) {
  if (!mudel.baseURL) throw new Error(`${mudel.id}: baseURL puudub`);
  // baseUrl alati seadistusest, et GOOGLE_GEMINI_BASE_URL seda ei muudaks.
  const httpOptions = { baseUrl: mudel.baseURL, retryOptions: { attempts: 1 } };
  if (fetch) httpOptions.fetch = fetch;
  const klient = new GoogleGenAI({ apiKey: apiVoti(mudel, env), vertexai: false, httpOptions });

  return async function saada(sonum) {
    const paring = {
      model: mudel.model,
      contents: [{ role: 'user', parts: [{ text: sonum }] }],
      config: { maxOutputTokens: maxValjund, automaticContinuation: false },
    };
    let tekst = '';
    let ttftMs = null;
    let finishReason = null;
    let modelVersion = null;
    let usageRaw = null;
    const algus = kell();
    try {
      const striim = await klient.models.generateContentStream(paring);
      for await (const tykk of striim) {
        if (tykk.modelVersion) modelVersion = tykk.modelVersion;
        // usageMetadata on jooksev kokkuvõte: viimane tükk annab lõplikud arvud.
        if (tykk.usageMetadata) usageRaw = tykk.usageMetadata;
        const kandidaat = tykk.candidates?.[0];
        if (!kandidaat) continue;
        for (const osa of kandidaat.content?.parts ?? []) {
          if (osa.thought || typeof osa.text !== 'string' || osa.text.length === 0) continue;
          if (ttftMs === null) ttftMs = kell() - algus;
          tekst += osa.text;
        }
        if (kandidaat.finishReason) finishReason = kandidaat.finishReason;
      }
    } catch (e) {
      throw teisendaViga(e, onApiViga);
    }
    const totalMs = kell() - algus;
    const usage = usageRaw
      ? normaliseeriUsage(usageRaw)
      : { input: null, cachedInput: null, output: null, reasoning: null };
    return { text: tekst, modelVersion, finishReason, usage, usageRaw, ttftMs, totalMs };
  };
}

// promptTokenCount sisaldab vahemälust loetud osa (cachedContentTokenCount).
// candidatesTokenCount ei sisalda mõtteid: kogu väljund = candidates + thoughts.
export function normaliseeriUsage(u) {
  const kandidaadid = taisarv(u.candidatesTokenCount);
  const motted = taisarv(u.thoughtsTokenCount);
  return {
    input: taisarv(u.promptTokenCount),
    cachedInput: taisarv(u.cachedContentTokenCount),
    output: kandidaadid === null && motted === null ? null : (kandidaadid ?? 0) + (motted ?? 0),
    reasoning: motted,
  };
}
