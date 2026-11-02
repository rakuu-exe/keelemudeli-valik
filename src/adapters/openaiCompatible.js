// OpenAI-ühilduv Chat Completions API: OpenAI, xAI ja DeepSeek (erinev baseURL).
//
// Saadetakse ainult: model, üks kasutajasõnum, maksimaalne väljundpikkus ja striimimise valikud.
// Max väljundi parameetri nimi tuleb seadistusest (maxTokensParam): OpenAI ja xAI
// max_completion_tokens (max_tokens on neil aegunud), DeepSeek max_tokens.
// stream_options.include_usage on mittegenereeriv valik: ilma selleta ei tule striimis tokenite arve.
import OpenAI from 'openai';
import { apiVoti, kell as vaikeKell, taisarv, teisendaViga } from './yhine.js';

const onApiViga = (e) => e instanceof OpenAI.APIError;

export function looOpenaiCompatible(mudel, { env = {}, maxValjund, fetch, kell = vaikeKell } = {}) {
  if (!mudel.baseURL) throw new Error(`${mudel.id}: baseURL puudub`);
  if (!mudel.maxTokensParam) throw new Error(`${mudel.id}: maxTokensParam puudub`);
  const klient = new OpenAI({
    apiKey: apiVoti(mudel, env),
    baseURL: mudel.baseURL, // alati seadistusest, et keskkonnamuutuja OPENAI_BASE_URL seda ei muudaks
    organization: null,
    project: null,
    maxRetries: 0, // korduskatsed teeb konveier (faas 2), mitte SDK
    fetch,
  });

  return async function saada(sonum) {
    const paring = {
      model: mudel.model,
      messages: [{ role: 'user', content: sonum }],
      [mudel.maxTokensParam]: maxValjund,
      stream: true,
      stream_options: { include_usage: true },
    };
    let tekst = '';
    let ttftMs = null;
    let finishReason = null;
    let modelVersion = null;
    let usageRaw = null;
    const algus = kell();
    try {
      const striim = await klient.chat.completions.create(paring);
      for await (const tykk of striim) {
        if (tykk.model) modelVersion = tykk.model;
        if (tykk.usage) usageRaw = tykk.usage;
        const valik = tykk.choices?.[0];
        if (!valik) continue;
        const osa = valik.delta?.content;
        if (typeof osa === 'string' && osa.length > 0) {
          if (ttftMs === null) ttftMs = kell() - algus;
          tekst += osa;
        }
        if (valik.finish_reason) finishReason = valik.finish_reason;
      }
    } catch (e) {
      throw teisendaViga(e, onApiViga);
    }
    const totalMs = kell() - algus;
    // Kui pakkuja usage't ei saatnud, jääb see null-iks: vastus on olemas, kulu arvutus märkab puudumist.
    const usage = usageRaw ? normaliseeriUsage(usageRaw, mudel) : TYHI_USAGE;
    return { text: tekst, modelVersion, finishReason, usage, usageRaw, ttftMs, totalMs };
  };
}

const TYHI_USAGE = Object.freeze({ input: null, cachedInput: null, output: null, reasoning: null });

// prompt_tokens sisaldab vahemälust loetud osa. DeepSeek tagastab sama arvu ka väljal
// prompt_cache_hit_tokens. completion_tokens sisaldab OpenAI-l ja DeepSeekil mõtlemistokeneid;
// xAI dokumentatsiooni näite järgi mitte (prompt + completion + reasoning = total).
// Seda määrab seadistuse väli completionIncludesReasoning.
export function normaliseeriUsage(u, mudel) {
  const reasoning = taisarv(u.completion_tokens_details?.reasoning_tokens);
  const cachedInput = taisarv(u.prompt_tokens_details?.cached_tokens) ?? taisarv(u.prompt_cache_hit_tokens);
  const lisa = mudel.completionIncludesReasoning === false ? (reasoning ?? 0) : 0;
  return {
    input: taisarv(u.prompt_tokens),
    cachedInput,
    output: taisarv(u.completion_tokens) === null ? null : u.completion_tokens + lisa,
    reasoning,
  };
}
