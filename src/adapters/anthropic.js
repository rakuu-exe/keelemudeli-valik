// Anthropic Messages API (@anthropic-ai/sdk).
//
// Only model, max_tokens and one user message are sent (streamed). No system prompt, thinking or
// effort parameter is sent: Sonnet 5.5 runs with its default adaptive thinking and default effort.
// Thinking blocks stream with empty text and are not part of the answer. The refusal fallback is not
// used: a refusal is a normal answer.
import Anthropic from '@anthropic-ai/sdk';
import { clock as defaultClock, getApiKey, intOrNull, toApiError } from './common.js';

const isSdkError = (e) => e instanceof Anthropic.APIError;

export function createAnthropic(model, { env = {}, maxOutputTokens, fetch, clock = defaultClock } = {}) {
  if (!model.baseURL) throw new Error(`${model.id}: baseURL is missing`);
  const client = new Anthropic({
    apiKey: getApiKey(model, env), // explicit key: the SDK then does not look for other credentials
    baseURL: model.baseURL, // always from the config, so that ANTHROPIC_BASE_URL cannot change it
    maxRetries: 0, // retries are done by the pipeline (phase 2), not by the SDK
    fetch,
  });

  return async function send(message) {
    const request = {
      model: model.model,
      max_tokens: maxOutputTokens,
      messages: [{ role: 'user', content: message }],
    };
    let ttftMs = null;
    let finalMessage;
    const start = clock();
    try {
      const stream = client.messages.stream(request);
      for await (const event of stream) {
        if (
          ttftMs === null &&
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta' &&
          event.delta.text.length > 0
        ) {
          ttftMs = clock() - start;
        }
      }
      finalMessage = await stream.finalMessage();
    } catch (e) {
      throw toApiError(e, isSdkError);
    }
    const totalMs = clock() - start;

    const text = finalMessage.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
    return {
      text,
      modelVersion: finalMessage.model ?? null,
      finishReason: finalMessage.stop_reason ?? null,
      usage: normalizeUsage(finalMessage.usage),
      usageRaw: finalMessage.usage,
      ttftMs,
      totalMs,
    };
  };
}

// input_tokens excludes the cache part: total input = input + cache_read + cache_creation.
// output_tokens includes reasoning tokens; their count is output_tokens_details.thinking_tokens.
export function normalizeUsage(u) {
  const input = intOrNull(u.input_tokens);
  const cacheRead = intOrNull(u.cache_read_input_tokens);
  const cacheCreation = intOrNull(u.cache_creation_input_tokens);
  return {
    input: input === null ? null : input + (cacheRead ?? 0) + (cacheCreation ?? 0),
    cachedInput: cacheRead,
    output: intOrNull(u.output_tokens),
    reasoning: intOrNull(u.output_tokens_details?.thinking_tokens),
  };
}
