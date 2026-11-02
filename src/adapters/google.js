// Google Gemini API (@google/genai).
//
// Only the model, the user message and maxOutputTokens are sent. No thinking level is set
// (provider default). Thoughts are not returned, because includeThoughts is left unset.
//
// SDK options that are not sent to the API but are needed for measurement:
//  - automaticContinuation: false: otherwise, on finishReason CONTINUATION, the SDK may make
//    further billable requests under the same raw row. One raw row = one API request.
//  - retryOptions.attempts: 1: retries are done by the pipeline (phase 2), not by the SDK.
import { ApiError as GenAIApiError, GoogleGenAI } from '@google/genai';
import { EMPTY_USAGE, clock as defaultClock, getApiKey, intOrNull, toApiError } from './common.js';

// Network errors from fetch (dropped connection, stream ended early, timeout) are API errors too.
const isSdkError = (e) =>
  e instanceof GenAIApiError ||
  e?.name === 'AbortError' ||
  e?.name === 'TimeoutError' ||
  (e instanceof TypeError && /fetch failed|terminated|network/i.test(e.message));

export function createGoogle(model, { env = {}, maxOutputTokens, fetch, clock = defaultClock } = {}) {
  if (!model.baseURL) throw new Error(`${model.id}: baseURL is missing`);
  // baseUrl always from the config, so that GOOGLE_GEMINI_BASE_URL cannot change it.
  const httpOptions = { baseUrl: model.baseURL, retryOptions: { attempts: 1 } };
  if (fetch) httpOptions.fetch = fetch;
  const client = new GoogleGenAI({ apiKey: getApiKey(model, env), vertexai: false, httpOptions });

  return async function send(message) {
    const request = {
      model: model.model,
      contents: [{ role: 'user', parts: [{ text: message }] }],
      config: { maxOutputTokens, automaticContinuation: false },
    };
    let text = '';
    let ttftMs = null;
    let finishReason = null;
    let modelVersion = null;
    let usageRaw = null;
    const start = clock();
    try {
      const stream = await client.models.generateContentStream(request);
      for await (const chunk of stream) {
        if (chunk.modelVersion) modelVersion = chunk.modelVersion;
        // usageMetadata is a running total: the last chunk has the final counts.
        if (chunk.usageMetadata) usageRaw = chunk.usageMetadata;
        const candidate = chunk.candidates?.[0];
        if (!candidate) continue;
        for (const part of candidate.content?.parts ?? []) {
          if (part.thought || typeof part.text !== 'string' || part.text.length === 0) continue;
          if (ttftMs === null) ttftMs = clock() - start;
          text += part.text;
        }
        if (candidate.finishReason) finishReason = candidate.finishReason;
      }
    } catch (e) {
      throw toApiError(e, isSdkError);
    }
    const totalMs = clock() - start;
    const usage = usageRaw ? normalizeUsage(usageRaw) : EMPTY_USAGE;
    return { text, modelVersion, finishReason, usage, usageRaw, ttftMs, totalMs };
  };
}

// promptTokenCount includes the part read from cache (cachedContentTokenCount).
// candidatesTokenCount excludes thoughts: total output = candidates + thoughts.
export function normalizeUsage(u) {
  const candidates = intOrNull(u.candidatesTokenCount);
  const thoughts = intOrNull(u.thoughtsTokenCount);
  return {
    input: intOrNull(u.promptTokenCount),
    cachedInput: intOrNull(u.cachedContentTokenCount),
    output: candidates === null && thoughts === null ? null : (candidates ?? 0) + (thoughts ?? 0),
    reasoning: thoughts,
  };
}
