// OpenAI-compatible Chat Completions API: OpenAI, xAI and DeepSeek (different baseURL).
//
// Only these are sent: model, one user message, the maximum output length and the streaming options.
// The name of the max output parameter comes from the config (maxTokensParam): OpenAI and xAI use
// max_completion_tokens (max_tokens is deprecated there), DeepSeek uses max_tokens.
// stream_options.include_usage is a non-generative option: without it the stream carries no token counts.
import OpenAI from 'openai';
import { ApiError, EMPTY_USAGE, clock as defaultClock, getApiKey, intOrNull, toApiError } from './common.js';

const isSdkError = (e) => e instanceof OpenAI.APIError;

export function createOpenAICompatible(model, { env = {}, maxOutputTokens, fetch, clock = defaultClock } = {}) {
  if (!model.baseURL) throw new Error(`${model.id}: baseURL is missing`);
  if (!model.maxTokensParam) throw new Error(`${model.id}: maxTokensParam is missing`);
  const client = new OpenAI({
    apiKey: getApiKey(model, env),
    baseURL: model.baseURL, // always from the config, so that OPENAI_BASE_URL cannot change it
    organization: null,
    project: null,
    maxRetries: 0, // retries are done by the pipeline (phase 2), not by the SDK
    fetch,
  });

  // signal (client side only, not sent to the API): the pipeline aborts the request on timeout.
  return async function send(message, { signal } = {}) {
    const request = {
      model: model.model,
      messages: [{ role: 'user', content: message }],
      [model.maxTokensParam]: maxOutputTokens,
      stream: true,
      stream_options: { include_usage: true },
    };
    let text = '';
    let ttftMs = null;
    let finishReason = null;
    let modelVersion = null;
    let usageRaw = null;
    const start = clock();
    try {
      const stream = await client.chat.completions.create(request, { signal });
      for await (const chunk of stream) {
        if (chunk.model) modelVersion = chunk.model;
        if (chunk.usage) usageRaw = chunk.usage;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const piece = choice.delta?.content;
        if (typeof piece === 'string' && piece.length > 0) {
          if (ttftMs === null) ttftMs = clock() - start;
          text += piece;
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
      // When the signal aborts the stream, the SDK ends the iteration without an error; the answer
      // is then incomplete and must not be stored as a normal result.
      if (signal?.aborted) throw new ApiError('Request aborted', { retryable: true });
    } catch (e) {
      throw toApiError(e, isSdkError);
    }
    const totalMs = clock() - start;
    // If the provider sent no usage, it stays null: the answer is kept and the cost step notices the gap.
    const usage = usageRaw ? normalizeUsage(usageRaw, model) : EMPTY_USAGE;
    return { text, modelVersion, finishReason, usage, usageRaw, ttftMs, totalMs };
  };
}

// prompt_tokens includes the part read from cache. DeepSeek also reports the same number in
// prompt_cache_hit_tokens. completion_tokens includes reasoning tokens for OpenAI and DeepSeek;
// according to the example in the xAI docs it does not (prompt + completion + reasoning = total).
// This is set by the config field completionIncludesReasoning.
export function normalizeUsage(u, model) {
  const reasoning = intOrNull(u.completion_tokens_details?.reasoning_tokens);
  const cachedInput = intOrNull(u.prompt_tokens_details?.cached_tokens) ?? intOrNull(u.prompt_cache_hit_tokens);
  const extra = model.completionIncludesReasoning === false ? (reasoning ?? 0) : 0;
  return {
    input: intOrNull(u.prompt_tokens),
    cachedInput,
    output: intOrNull(u.completion_tokens) === null ? null : u.completion_tokens + extra,
    reasoning,
  };
}
