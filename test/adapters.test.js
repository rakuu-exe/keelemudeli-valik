// Adapter tests. No network requests are made: the SDK gets a fake fetch that returns an SSE stream
// built according to the provider's documentation and records the body of the request sent.
// This also checks what the adapter would actually send over the network.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAdapter, ApiError } from '../src/adapters/index.js';

const CONFIG = JSON.parse(fs.readFileSync(new URL('../config/models.json', import.meta.url), 'utf8'));
const MODEL = Object.fromEntries(CONFIG.models.map((m) => [m.id, m]));
const ENV = {
  OPENAI_API_KEY: 'test-openai',
  ANTHROPIC_API_KEY: 'test-anthropic',
  GEMINI_API_KEY: 'test-gemini',
  DEEPSEEK_API_KEY: 'test-deepseek',
  XAI_API_KEY: 'test-xai',
};
const MESSAGE = 'Tekst:\nEttevõte avas uue lao Tartus.\n\nMillises linnas? Vasta ühe sõnaga.';

// A clock that moves 10 ms forward on every read: start 0, first text 10, end 20.
function steppingClock() {
  let t = 0;
  return () => {
    const v = t;
    t += 10;
    return v;
  };
}

function sse(events, { named = false } = {}) {
  return events
    .map((e) => (e === '[DONE]' ? 'data: [DONE]\n\n' : `${named ? `event: ${e.type}\n` : ''}data: ${JSON.stringify(e)}\n\n`))
    .join('');
}

function fakeFetch(responses) {
  const requests = [];
  const fetch = async (url, init = {}) => {
    requests.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null, headers: init.headers });
    const r = responses[Math.min(requests.length - 1, responses.length - 1)];
    return new Response(r.body, {
      status: r.status ?? 200,
      headers: { 'content-type': r.status && r.status !== 200 ? 'application/json' : 'text/event-stream' },
    });
  };
  return { fetch, requests };
}

function setup(id, responses) {
  const { fetch, requests } = fakeFetch(responses);
  const send = createAdapter(MODEL[id], { env: ENV, maxOutputTokens: CONFIG.maxOutputTokens, fetch, clock: steppingClock() });
  return { send, requests };
}

// --- OpenAI-compatible (OpenAI, DeepSeek, xAI) ---

function openaiStream({ model, usage, content = ['', 'Tal', 'linn'], finish = 'stop' }) {
  const base = { id: 'c1', object: 'chat.completion.chunk', created: 1, model };
  return sse([
    ...content.map((c) => ({ ...base, choices: [{ index: 0, delta: { content: c }, finish_reason: null }], usage: null })),
    { ...base, choices: [{ index: 0, delta: {}, finish_reason: finish }], usage: null },
    { ...base, choices: [], usage },
    '[DONE]',
  ]);
}

describe('openaiCompatible', () => {
  test('OpenAI: the request has only the model, one user message, max output and streaming', async () => {
    const usage = {
      prompt_tokens: 40, completion_tokens: 30, total_tokens: 70,
      prompt_tokens_details: { cached_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 25 },
    };
    const { send, requests } = setup('openai', [{ body: openaiStream({ model: 'gpt-6.1-terra-2026-10-01', usage }) }]);
    const r = await send(MESSAGE);

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.openai.com/v1/chat/completions');
    assert.deepEqual(requests[0].body, {
      model: 'gpt-6.1-terra',
      messages: [{ role: 'user', content: MESSAGE }],
      max_completion_tokens: 16000,
      stream: true,
      stream_options: { include_usage: true },
    });
    assert.equal(r.text, 'Tallinn');
    assert.equal(r.modelVersion, 'gpt-6.1-terra-2026-10-01');
    assert.equal(r.finishReason, 'stop');
    assert.deepEqual(r.usage, { input: 40, cachedInput: 0, output: 30, reasoning: 25 });
    assert.deepEqual(r.usageRaw, usage);
    // The first chunk is an empty string: TTFT is the time of the second chunk.
    assert.equal(r.ttftMs, 10);
    assert.equal(r.totalMs, 20);
  });

  test('DeepSeek: max_tokens, baseURL and the cache field prompt_cache_hit_tokens', async () => {
    const usage = {
      prompt_tokens: 214, completion_tokens: 57, total_tokens: 271,
      prompt_cache_hit_tokens: 192, prompt_cache_miss_tokens: 22,
      completion_tokens_details: { reasoning_tokens: 40 },
    };
    const { send, requests } = setup('deepseek', [{ body: openaiStream({ model: 'deepseek-flash', usage }) }]);
    const r = await send(MESSAGE);

    assert.equal(requests[0].url, 'https://api.deepseek.com/chat/completions');
    assert.equal(requests[0].body.max_tokens, 16000);
    assert.equal(requests[0].body.max_completion_tokens, undefined);
    assert.deepEqual(r.usage, { input: 214, cachedInput: 192, output: 57, reasoning: 40 });
  });

  test('DeepSeek: reasoning_content is not part of the answer and does not affect TTFT', async () => {
    const base = { id: 'c1', object: 'chat.completion.chunk', created: 1, model: 'deepseek-flash' };
    const body = sse([
      { ...base, choices: [{ index: 0, delta: { reasoning_content: 'Mõtlen...', content: null }, finish_reason: null }] },
      { ...base, choices: [{ index: 0, delta: { reasoning_content: 'Tallinn.', content: null }, finish_reason: null }] },
      { ...base, choices: [{ index: 0, delta: { content: 'Tallinn' }, finish_reason: 'stop' }] },
      { ...base, choices: [], usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 } },
      '[DONE]',
    ]);
    const { fetch } = fakeFetch([{ body }]);
    // The clock is read only at the start (0), at the first answer text (10) and at the end (20).
    const send = createAdapter(MODEL.deepseek, { env: ENV, maxOutputTokens: 16000, fetch, clock: steppingClock() });
    const r = await send(MESSAGE);
    assert.equal(r.text, 'Tallinn');
    assert.equal(r.ttftMs, 10);
    assert.deepEqual(r.usage, { input: 10, cachedInput: null, output: 8, reasoning: null });
  });

  test('xAI: max_completion_tokens; completion_tokens excludes reasoning → output = completion + reasoning', async () => {
    // Example from the xAI Chat Completions docs: 32 + 9 + 94 = 135.
    const usage = {
      prompt_tokens: 32, completion_tokens: 9, total_tokens: 135,
      prompt_tokens_details: { cached_tokens: 6 }, completion_tokens_details: { reasoning_tokens: 94 },
    };
    const { send, requests } = setup('xai', [{ body: openaiStream({ model: 'grok-4.7', usage }) }]);
    const r = await send(MESSAGE);

    assert.equal(requests[0].url, 'https://api.x.ai/v1/chat/completions');
    assert.deepEqual(Object.keys(requests[0].body).sort(), ['max_completion_tokens', 'messages', 'model', 'stream', 'stream_options']);
    assert.deepEqual(r.usage, { input: 32, cachedInput: 6, output: 103, reasoning: 94 });
    assert.equal(r.usage.input + r.usage.output, usage.total_tokens);
  });

  test('an answer truncated by length is a normal result (finishReason length)', async () => {
    const usage = { prompt_tokens: 5, completion_tokens: 16000, total_tokens: 16005 };
    const { send } = setup('openai', [{ body: openaiStream({ model: 'gpt-6.1-terra', usage, finish: 'length' }) }]);
    const r = await send(MESSAGE);
    assert.equal(r.finishReason, 'length');
  });

  test('empty answer: text is empty and ttftMs is null', async () => {
    const usage = { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 };
    const { send } = setup('openai', [{ body: openaiStream({ model: 'gpt-6.1-terra', usage, content: [''] }) }]);
    const r = await send(MESSAGE);
    assert.equal(r.text, '');
    assert.equal(r.ttftMs, null);
    assert.equal(typeof r.totalMs, 'number');
  });

  test('missing usage → usage fields null, answer kept', async () => {
    const base = { id: 'c1', object: 'chat.completion.chunk', created: 1, model: 'gpt-6.1-terra' };
    const body = sse([{ ...base, choices: [{ index: 0, delta: { content: 'X' }, finish_reason: 'stop' }] }, '[DONE]']);
    const { fetch } = fakeFetch([{ body }]);
    const send = createAdapter(MODEL.openai, { env: ENV, maxOutputTokens: 16000, fetch });
    const r = await send(MESSAGE);
    assert.equal(r.text, 'X');
    assert.equal(r.usageRaw, null);
    assert.deepEqual(r.usage, { input: null, cachedInput: null, output: null, reasoning: null });
  });

  for (const [status, retryable] of [[429, true], [500, true], [503, true], [400, false], [401, false], [404, false]]) {
    test(`HTTP ${status} → ApiError, retryable=${retryable}, the SDK does not retry`, async () => {
      const { send, requests } = setup('openai', [{ status, body: JSON.stringify({ error: { message: 'error', type: 'x' } }) }]);
      await assert.rejects(send(MESSAGE), (e) => e instanceof ApiError && e.status === status && e.retryable === retryable);
      assert.equal(requests.length, 1);
    });
  }

  test('connection error → ApiError, status null, retryable', async () => {
    const fetch = async () => { throw new TypeError('fetch failed'); };
    const send = createAdapter(MODEL.xai, { env: ENV, maxOutputTokens: 16000, fetch });
    await assert.rejects(send(MESSAGE), (e) => e instanceof ApiError && e.status === null && e.retryable === true);
  });
});

// --- Anthropic ---

function anthropicStream({ text = ['Tal', 'linn'], stopReason = 'end_turn', startUsage, endUsage, model = 'claude-sonnet-5-5' }) {
  return sse([
    {
      type: 'message_start',
      message: {
        id: 'msg_1', type: 'message', role: 'assistant', model, content: [],
        stop_reason: null, stop_sequence: null, usage: startUsage,
      },
    },
    { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'abc' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
    ...text.map((t) => ({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: t } })),
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: endUsage },
    { type: 'message_stop' },
  ], { named: true });
}

describe('anthropic', () => {
  const startUsage = { input_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 100, output_tokens: 1 };
  const endUsage = { output_tokens: 57, output_tokens_details: { thinking_tokens: 40 } };

  test('the request has only the model, max_tokens, one user message and stream', async () => {
    const { send, requests } = setup('anthropic', [{ body: anthropicStream({ startUsage, endUsage }) }]);
    const r = await send(MESSAGE);

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.anthropic.com/v1/messages');
    assert.deepEqual(requests[0].body, {
      model: 'claude-sonnet-5-5',
      max_tokens: 16000,
      messages: [{ role: 'user', content: MESSAGE }],
      stream: true,
    });
    assert.equal(r.text, 'Tallinn');
    assert.equal(r.modelVersion, 'claude-sonnet-5-5');
    assert.equal(r.finishReason, 'end_turn');
    // Total input = input_tokens + read from cache + written to cache.
    assert.deepEqual(r.usage, { input: 120, cachedInput: 100, output: 57, reasoning: 40 });
    assert.equal(r.usageRaw.output_tokens, 57);
    // The thinking block does not count: TTFT is the time of the first text_delta.
    assert.equal(r.ttftMs, 10);
    assert.equal(r.totalMs, 20);
  });

  test('a refusal is a normal result (stop_reason refusal)', async () => {
    const { send } = setup('anthropic', [{ body: anthropicStream({ text: [], stopReason: 'refusal', startUsage, endUsage: { output_tokens: 3 } }) }]);
    const r = await send(MESSAGE);
    assert.equal(r.finishReason, 'refusal');
    assert.equal(r.text, '');
    assert.equal(r.ttftMs, null);
    assert.equal(r.usage.reasoning, null);
  });

  for (const [status, retryable] of [[429, true], [529, true], [500, true], [400, false]]) {
    test(`HTTP ${status} → ApiError, retryable=${retryable}, the SDK does not retry`, async () => {
      const body = JSON.stringify({ type: 'error', error: { type: 'x', message: 'error' } });
      const { send, requests } = setup('anthropic', [{ status, body }]);
      await assert.rejects(send(MESSAGE), (e) => e instanceof ApiError && e.status === status && e.retryable === retryable);
      assert.equal(requests.length, 1);
    });
  }

  test('error in the middle of the stream (overloaded_error) → retryable ApiError', async () => {
    const body = sse([
      { type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null, usage: startUsage } },
      { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } },
    ], { named: true });
    const { send } = setup('anthropic', [{ body }]);
    await assert.rejects(send(MESSAGE), (e) => e instanceof ApiError && e.retryable === true);
  });
});

// --- Google ---

function googleStream({ chunks, usage, model = 'gemini-3.8-flash', finish = 'STOP' }) {
  return sse(chunks.map((text, i) => {
    const last = i === chunks.length - 1;
    return {
      candidates: [{
        content: { role: 'model', parts: text === null ? [] : [{ text }] },
        index: 0,
        ...(last ? { finishReason: finish } : {}),
      }],
      usageMetadata: last ? usage : { promptTokenCount: usage.promptTokenCount },
      modelVersion: model,
      responseId: 'r1',
    };
  }));
}

describe('google', () => {
  const usage = {
    promptTokenCount: 214, cachedContentTokenCount: 192, candidatesTokenCount: 17,
    thoughtsTokenCount: 40, totalTokenCount: 271,
  };

  test('the request has only the contents and maxOutputTokens; the SDK does not send automaticContinuation', async () => {
    const { send, requests } = setup('google', [{ body: googleStream({ chunks: ['Tal', 'linn'], usage }) }]);
    const r = await send(MESSAGE);

    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:streamGenerateContent\?alt=sse$/);
    assert.deepEqual(requests[0].body, {
      contents: [{ role: 'user', parts: [{ text: MESSAGE }] }],
      generationConfig: { maxOutputTokens: 16000 },
    });
    assert.equal(r.text, 'Tallinn');
    assert.equal(r.modelVersion, 'gemini-3.8-flash');
    assert.equal(r.finishReason, 'STOP');
    // Output = candidates + thoughts.
    assert.deepEqual(r.usage, { input: 214, cachedInput: 192, output: 57, reasoning: 40 });
    assert.equal(r.usage.input + r.usage.output, usage.totalTokenCount);
    assert.deepEqual(r.usageRaw, usage);
    assert.equal(r.ttftMs, 10);
    assert.equal(r.totalMs, 20);
  });

  test('an empty first chunk does not count as TTFT; MAX_TOKENS is a normal result', async () => {
    const { send } = setup('google', [{ body: googleStream({ chunks: [null, 'A'], usage, finish: 'MAX_TOKENS' }) }]);
    const r = await send(MESSAGE);
    assert.equal(r.text, 'A');
    assert.equal(r.ttftMs, 10);
    assert.equal(r.finishReason, 'MAX_TOKENS');
  });

  test('cache and thought fields missing → null', async () => {
    const u = { promptTokenCount: 10, candidatesTokenCount: 3, totalTokenCount: 13 };
    const { send } = setup('google', [{ body: googleStream({ chunks: ['A'], usage: u }) }]);
    const r = await send(MESSAGE);
    assert.deepEqual(r.usage, { input: 10, cachedInput: null, output: 3, reasoning: null });
  });

  for (const [status, retryable] of [[429, true], [503, true], [400, false]]) {
    test(`HTTP ${status} → ApiError, retryable=${retryable}, the SDK does not retry`, async () => {
      const body = JSON.stringify({ error: { code: status, message: 'error', status: 'X' } });
      const { send, requests } = setup('google', [{ status, body }]);
      await assert.rejects(send(MESSAGE), (e) => e instanceof ApiError && e.status === status && e.retryable === retryable);
      assert.equal(requests.length, 1);
    });
  }
});

// --- General ---

describe('createAdapter', () => {
  test('missing API key → clear error before any request', () => {
    assert.throws(() => createAdapter(MODEL.openai, { env: {}, maxOutputTokens: 16000 }), /OPENAI_API_KEY/);
  });

  test('unknown adapter → error', () => {
    assert.throws(() => createAdapter({ id: 'x', adapter: 'missing' }, { maxOutputTokens: 1 }), /unknown adapter/);
  });

  test('fake: deterministic answer with the same shape as the real adapters', async () => {
    const send = createAdapter({ id: 'openai', adapter: 'fake', model: 'gpt-6.1-terra' });
    const a = await send(MESSAGE);
    const b = await send(MESSAGE);
    assert.deepEqual(a, b);
    assert.deepEqual(Object.keys(a).sort(), ['finishReason', 'modelVersion', 'text', 'totalMs', 'ttftMs', 'usage', 'usageRaw']);
    assert.deepEqual(Object.keys(a.usage).sort(), ['cachedInput', 'input', 'output', 'reasoning']);
  });

  test('fake: a given error is thrown as ApiError', async () => {
    const send = createAdapter({ id: 'x', adapter: 'fake' }, { fail: () => new ApiError('429', { status: 429, retryable: true }) });
    await assert.rejects(send(MESSAGE), (e) => e instanceof ApiError && e.status === 429);
  });
});

// --- Abort signal (the pipeline's request timeout) ---

// A fetch whose stream sends one chunk and then hangs until the request's signal is aborted,
// as a real fetch does on a stalled connection.
function hangingFetch(firstChunk) {
  const seen = { signal: null, body: null };
  const fetch = async (url, init = {}) => {
    seen.signal = init.signal ?? null;
    seen.body = init.body ? JSON.parse(init.body) : null;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(firstChunk));
        init.signal?.addEventListener('abort', () =>
          controller.error(init.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')));
      },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  return { fetch, seen };
}

describe('abort signal', () => {
  const firstChunks = {
    openai: sse([{
      id: 'c1', object: 'chat.completion.chunk', created: 1, model: 'gpt-6.1-terra',
      choices: [{ index: 0, delta: { content: 'Tal' }, finish_reason: null }], usage: null,
    }]),
    anthropic: sse([{
      type: 'message_start',
      message: {
        id: 'm', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [],
        stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
      },
    }], { named: true }),
    google: sse([{ candidates: [{ content: { role: 'model', parts: [{ text: 'Tal' }] }, index: 0 }], modelVersion: 'gemini-3.8-flash' }]),
  };

  for (const [id, firstChunk] of Object.entries(firstChunks)) {
    test(`${id}: aborting stops the request also while the stream is being read`, { timeout: 5000 }, async () => {
      const { fetch, seen } = hangingFetch(firstChunk);
      const send = createAdapter(MODEL[id], { env: ENV, maxOutputTokens: 16000, fetch });
      const controller = new AbortController();
      const pending = send(MESSAGE, { signal: controller.signal });
      setTimeout(() => controller.abort(), 20);
      await assert.rejects(pending);
      assert.ok(seen.signal, 'the SDK passes a signal to fetch');
    });
  }

  test('google: abortSignal is client side only and not sent to the API', { timeout: 5000 }, async () => {
    const { fetch, seen } = hangingFetch(firstChunks.google);
    const send = createAdapter(MODEL.google, { env: ENV, maxOutputTokens: 16000, fetch });
    const controller = new AbortController();
    const pending = send(MESSAGE, { signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    await assert.rejects(pending);
    assert.deepEqual(seen.body, {
      contents: [{ role: 'user', parts: [{ text: MESSAGE }] }],
      generationConfig: { maxOutputTokens: 16000 },
    });
  });
});

describe('config/models.json', () => {
  test('the five compared models as in the CLAUDE.md table, then Luna (reproducibility test only); max output 16,000', () => {
    assert.equal(CONFIG.maxOutputTokens, 16000);
    assert.deepEqual(
      CONFIG.models.map((m) => [m.id, m.adapter, m.model]),
      [
        ['openai', 'openaiCompatible', 'gpt-6.1-terra'],
        ['anthropic', 'anthropic', 'claude-sonnet-5-5'],
        ['google', 'google', 'gemini-3.8-flash'],
        ['deepseek', 'openaiCompatible', 'deepseek-flash'],
        ['xai', 'openaiCompatible', 'grok-4.7'],
        ['luna', 'openaiCompatible', 'gpt-6-luna'],
      ],
    );
  });

  test('every model has its key variable in .env.example and a baseURL', () => {
    const example = fs.readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
    for (const m of CONFIG.models) {
      assert.match(example, new RegExp(`^${m.apiKeyEnv}=`, 'm'), m.id);
      assert.ok(m.baseURL, m.id);
      if (m.adapter === 'openaiCompatible') {
        assert.ok(['max_tokens', 'max_completion_tokens'].includes(m.maxTokensParam), m.id);
        assert.equal(typeof m.completionIncludesReasoning, 'boolean', m.id);
      }
    }
  });
});
