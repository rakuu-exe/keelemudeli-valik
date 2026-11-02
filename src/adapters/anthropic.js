// Anthropic Messages API (@anthropic-ai/sdk).
//
// Saadetakse ainult model, max_tokens ja üks kasutajasõnum (striimina). Süsteemijuhist,
// thinking- ega effort-parameetrit ei saadeta: Sonnet 5.5 töötab vaikimisi adaptiivse
// mõtlemisega ja vaikimisi effort-tasemel. Mõtlemisplokid striimitakse tühja tekstiga ega
// ole vastuse osa. Refusal-fallback'i ei kasutata: keeldumine on tavaline vastus.
import Anthropic from '@anthropic-ai/sdk';
import { apiVoti, kell as vaikeKell, taisarv, teisendaViga } from './yhine.js';

const onApiViga = (e) => e instanceof Anthropic.APIError;

export function looAnthropic(mudel, { env = {}, maxValjund, fetch, kell = vaikeKell } = {}) {
  if (!mudel.baseURL) throw new Error(`${mudel.id}: baseURL puudub`);
  const klient = new Anthropic({
    apiKey: apiVoti(mudel, env), // selgesõnaline võti: SDK ei otsi siis teisi autentimisviise
    baseURL: mudel.baseURL, // alati seadistusest, et ANTHROPIC_BASE_URL seda ei muudaks
    maxRetries: 0, // korduskatsed teeb konveier (faas 2), mitte SDK
    fetch,
  });

  return async function saada(sonum) {
    const paring = {
      model: mudel.model,
      max_tokens: maxValjund,
      messages: [{ role: 'user', content: sonum }],
    };
    let ttftMs = null;
    let sonumLopp;
    const algus = kell();
    try {
      const striim = klient.messages.stream(paring);
      for await (const sundmus of striim) {
        if (
          ttftMs === null &&
          sundmus.type === 'content_block_delta' &&
          sundmus.delta.type === 'text_delta' &&
          sundmus.delta.text.length > 0
        ) {
          ttftMs = kell() - algus;
        }
      }
      sonumLopp = await striim.finalMessage();
    } catch (e) {
      throw teisendaViga(e, onApiViga);
    }
    const totalMs = kell() - algus;

    const tekst = sonumLopp.content
      .filter((plokk) => plokk.type === 'text')
      .map((plokk) => plokk.text)
      .join('');
    return {
      text: tekst,
      modelVersion: sonumLopp.model ?? null,
      finishReason: sonumLopp.stop_reason ?? null,
      usage: normaliseeriUsage(sonumLopp.usage),
      usageRaw: sonumLopp.usage,
      ttftMs,
      totalMs,
    };
  };
}

// input_tokens ei sisalda vahemälu osa: kogu sisend = input + cache_read + cache_creation.
// output_tokens sisaldab mõtlemistokeneid; nende arv on output_tokens_details.thinking_tokens.
export function normaliseeriUsage(u) {
  const sisend = taisarv(u.input_tokens);
  const loetud = taisarv(u.cache_read_input_tokens);
  const loodud = taisarv(u.cache_creation_input_tokens);
  return {
    input: sisend === null ? null : sisend + (loetud ?? 0) + (loodud ?? 0),
    cachedInput: loetud,
    output: taisarv(u.output_tokens),
    reasoning: taisarv(u.output_tokens_details?.thinking_tokens),
  };
}
