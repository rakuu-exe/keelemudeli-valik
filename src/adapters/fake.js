// Fake adapter for tests and --dry-run. Makes no network requests.
// The result is deterministic: the same message and model always give the same result.
import { ApiError } from './common.js';

// options.respond(message, model, { signal }) → text or a promise of it (tests use it to simulate a
// request that hangs until it is aborted); options.fail(message, model) → ApiError or null.
export function createFake(model, { respond, fail } = {}) {
  return async function send(message, { signal } = {}) {
    const error = fail?.(message, model);
    if (error) throw error instanceof ApiError ? error : new ApiError(String(error));
    const text = respond ? await respond(message, model, { signal }) : `Fake answer (${model.id})`;
    const input = Math.ceil(message.length / 4);
    const output = Math.ceil(text.length / 4);
    return {
      text,
      modelVersion: `fake-${model.model ?? model.id}`,
      finishReason: 'stop',
      usage: { input, cachedInput: null, output, reasoning: null },
      usageRaw: { input_tokens: input, output_tokens: output },
      ttftMs: 1,
      totalMs: 2,
    };
  };
}
