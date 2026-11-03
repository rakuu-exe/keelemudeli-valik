// Shared adapter code: error class, key lookup and timing.
//
// Every adapter returns a function send(message, { signal }) that resolves to
//   { text, modelVersion, finishReason, usage, usageRaw, ttftMs, totalMs }
//   usage = { input, cachedInput, output, reasoning }
//     input       all input tokens (including the part read from cache)
//     cachedInput input tokens read from cache; null if the provider does not report it
//     output      all output tokens (including reasoning tokens)
//     reasoning   reasoning tokens; null if the provider does not report them separately
//   usageRaw = the provider's usage object, unchanged
//   ttftMs  = time from request start to the first non-empty chunk of answer text
//             (reasoning is not counted); null if the answer has no text
//   totalMs = time from request start to the end of the stream
// API errors are thrown as ApiError. A refusal, an empty answer or a truncated answer is a normal result.
// signal is an AbortSignal (client side only, never sent to the API): the pipeline uses it for the
// request timeout, and it must abort the request also while the stream is being read.

export const clock = () => performance.now();

export class ApiError extends Error {
  constructor(message, { status = null, retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.status = status;
    // Phase 2 retries only retryable errors: 429, 5xx, timeout and dropped connection [PK1].
    this.retryable = retryable;
  }
}

export function isRetryableStatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

// Converts an SDK error. isSdkError(e) tells whether the error came from the API or the network.
// An API error without a status (timeout, dropped connection or stream) is retryable.
// Any other error (e.g. a programming error) is rethrown unchanged so it cannot hide behind an API error.
export function toApiError(e, isSdkError) {
  if (e instanceof ApiError) return e;
  if (!isSdkError(e)) return e;
  const status = typeof e.status === 'number' ? e.status : null;
  const retryable = status === null ? true : isRetryableStatus(status);
  return new ApiError(String(e.message ?? e), { status, retryable, cause: e });
}

// Missing key → immediate error, not a silent fallback to the SDK's other authentication methods.
export function getApiKey(model, env) {
  const name = model.apiKeyEnv;
  const key = name ? env[name] : undefined;
  if (!key) throw new Error(`${model.id}: API key ${name} is missing from .env (see .env.example)`);
  return key;
}

export const intOrNull = (v) => (typeof v === 'number' ? v : null);

export const EMPTY_USAGE = Object.freeze({ input: null, cachedInput: null, output: null, reasoning: null });
