// Retries of temporary API errors [PK1]: 429, 5xx, timeout and dropped connection get up to 3 new
// attempts with an increasing wait; any other API error ends the request at once.
// Timeout and waits: author's decision 3.11.2026.
import { ApiError } from '../adapters/index.js';

// 10 minutes is the default of the OpenAI and Anthropic SDKs; the Google SDK has no timeout of its own.
// It covers the whole attempt, including reading the stream.
export const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
export const RETRY_WAITS_MS = [10_000, 30_000, 60_000];

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calls send(message, { signal }) until it succeeds, a non-retryable error comes or the retries run out.
// Returns { result, tsStartUtc, retries } or { error, tsStartUtc, retries }:
//   tsStartUtc is the start of the last attempt, the one the raw row describes (the DeepSeek price
//   depends on it);
//   retries lists the earlier failed attempts, so that every request made with the key is logged [PK9].
// A timed-out attempt is aborted through the signal and becomes a retryable ApiError, whatever the
// SDK threw. Other errors that are not ApiErrors (programming errors) are rethrown.
export async function sendWithRetry(send, message, {
  timeoutMs = REQUEST_TIMEOUT_MS,
  waitsMs = RETRY_WAITS_MS,
  sleep = realSleep,
  now = () => new Date(),
  onRetry = () => {},
} = {}) {
  const retries = [];
  for (let attempt = 0; ; attempt++) {
    const tsStartUtc = now().toISOString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const timeout = (cause) =>
      new ApiError(`Timeout: no complete answer within ${timeoutMs / 1000} s`, { retryable: true, cause });
    let error;
    try {
      const result = await send(message, { signal: controller.signal });
      // An SDK may end an aborted stream without an error: after a timeout the answer is incomplete.
      if (!controller.signal.aborted) return { result, tsStartUtc, retries };
      error = timeout();
    } catch (e) {
      error = controller.signal.aborted ? timeout(e) : e;
      if (!(error instanceof ApiError)) throw error;
    } finally {
      clearTimeout(timer);
    }
    if (!error.retryable || attempt >= waitsMs.length) return { error, tsStartUtc, retries };
    retries.push({ tsStartUtc, httpStatus: error.status ?? null, message: error.message });
    onRetry({ retry: attempt + 1, error, waitMs: waitsMs[attempt] });
    await sleep(waitsMs[attempt]);
  }
}
