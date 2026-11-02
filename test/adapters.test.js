// Adapterite testid. Võrgupäringuid ei tehta: SDK-le antakse võlts-fetch, mis tagastab
// pakkuja dokumentatsiooni järgi koostatud SSE-striimi ja salvestab saadetud päringu keha.
// Nii kontrollitakse ka seda, mida adapter päriselt üle võrgu saadaks.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { looAdapter, ApiViga } from '../src/adapters/index.js';

const SEADISTUS = JSON.parse(fs.readFileSync(new URL('../config/models.json', import.meta.url), 'utf8'));
const MUDEL = Object.fromEntries(SEADISTUS.models.map((m) => [m.id, m]));
const ENV = {
  OPENAI_API_KEY: 'test-openai',
  ANTHROPIC_API_KEY: 'test-anthropic',
  GEMINI_API_KEY: 'test-gemini',
  DEEPSEEK_API_KEY: 'test-deepseek',
  XAI_API_KEY: 'test-xai',
};
const SONUM = 'Tekst:\nEttevõte avas uue lao Tartus.\n\nMillises linnas? Vasta ühe sõnaga.';

// Kell, mis liigub iga lugemisega 10 ms edasi: algus 0, esimene tekst 10, lõpp 20.
function samuKell() {
  let t = 0;
  return () => {
    const v = t;
    t += 10;
    return v;
  };
}

function sse(sundmused, { nimetatud = false } = {}) {
  return sundmused
    .map((s) => (s === '[DONE]' ? 'data: [DONE]\n\n' : `${nimetatud ? `event: ${s.type}\n` : ''}data: ${JSON.stringify(s)}\n\n`))
    .join('');
}

function voltsFetch(vastused) {
  const paringud = [];
  const fetch = async (url, init = {}) => {
    paringud.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null, headers: init.headers });
    const v = vastused[Math.min(paringud.length - 1, vastused.length - 1)];
    return new Response(v.body, {
      status: v.status ?? 200,
      headers: { 'content-type': v.status && v.status !== 200 ? 'application/json' : 'text/event-stream' },
    });
  };
  return { fetch, paringud };
}

function loo(id, vastused) {
  const { fetch, paringud } = voltsFetch(vastused);
  const saada = looAdapter(MUDEL[id], { env: ENV, maxValjund: SEADISTUS.maxOutputTokens, fetch, kell: samuKell() });
  return { saada, paringud };
}

// --- OpenAI-ühilduv (OpenAI, DeepSeek, xAI) ---

function openaiStriim({ mudel, usage, sisu = ['', 'Tal', 'linn'], lopp = 'stop' }) {
  const baas = { id: 'c1', object: 'chat.completion.chunk', created: 1, model: mudel };
  return sse([
    ...sisu.map((c) => ({ ...baas, choices: [{ index: 0, delta: { content: c }, finish_reason: null }], usage: null })),
    { ...baas, choices: [{ index: 0, delta: {}, finish_reason: lopp }], usage: null },
    { ...baas, choices: [], usage },
    '[DONE]',
  ]);
}

describe('openaiCompatible', () => {
  test('OpenAI: päringus on ainult mudel, üks kasutajasõnum, max väljund ja striimimine', async () => {
    const usage = {
      prompt_tokens: 40, completion_tokens: 30, total_tokens: 70,
      prompt_tokens_details: { cached_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 25 },
    };
    const { saada, paringud } = loo('openai', [{ body: openaiStriim({ mudel: 'gpt-6.1-terra-2026-10-01', usage }) }]);
    const t = await saada(SONUM);

    assert.equal(paringud.length, 1);
    assert.equal(paringud[0].url, 'https://api.openai.com/v1/chat/completions');
    assert.deepEqual(paringud[0].body, {
      model: 'gpt-6.1-terra',
      messages: [{ role: 'user', content: SONUM }],
      max_completion_tokens: 16000,
      stream: true,
      stream_options: { include_usage: true },
    });
    assert.equal(t.text, 'Tallinn');
    assert.equal(t.modelVersion, 'gpt-6.1-terra-2026-10-01');
    assert.equal(t.finishReason, 'stop');
    assert.deepEqual(t.usage, { input: 40, cachedInput: 0, output: 30, reasoning: 25 });
    assert.deepEqual(t.usageRaw, usage);
    // Esimene tükk on tühi string: TTFT on teise tüki aeg.
    assert.equal(t.ttftMs, 10);
    assert.equal(t.totalMs, 20);
  });

  test('DeepSeek: max_tokens, baseURL ja vahemälu väli prompt_cache_hit_tokens', async () => {
    const usage = {
      prompt_tokens: 214, completion_tokens: 57, total_tokens: 271,
      prompt_cache_hit_tokens: 192, prompt_cache_miss_tokens: 22,
      completion_tokens_details: { reasoning_tokens: 40 },
    };
    const { saada, paringud } = loo('deepseek', [{ body: openaiStriim({ mudel: 'deepseek-flash', usage }) }]);
    const t = await saada(SONUM);

    assert.equal(paringud[0].url, 'https://api.deepseek.com/chat/completions');
    assert.equal(paringud[0].body.max_tokens, 16000);
    assert.equal(paringud[0].body.max_completion_tokens, undefined);
    assert.deepEqual(t.usage, { input: 214, cachedInput: 192, output: 57, reasoning: 40 });
  });

  test('DeepSeek: reasoning_content ei ole vastuse osa ega mõjuta TTFT-d', async () => {
    const baas = { id: 'c1', object: 'chat.completion.chunk', created: 1, model: 'deepseek-flash' };
    const body = sse([
      { ...baas, choices: [{ index: 0, delta: { reasoning_content: 'Mõtlen...', content: null }, finish_reason: null }] },
      { ...baas, choices: [{ index: 0, delta: { reasoning_content: 'Tallinn.', content: null }, finish_reason: null }] },
      { ...baas, choices: [{ index: 0, delta: { content: 'Tallinn' }, finish_reason: 'stop' }] },
      { ...baas, choices: [], usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 } },
      '[DONE]',
    ]);
    const { fetch } = voltsFetch([{ body }]);
    // Kell: algus 0, 1. tükk 10 (ei loe), 2. tükk 20 (ei loe), 3. tükk loeb → 0 + 10 = 10.
    const saada = looAdapter(MUDEL.deepseek, { env: ENV, maxValjund: 16000, fetch, kell: samuKell() });
    const t = await saada(SONUM);
    assert.equal(t.text, 'Tallinn');
    assert.equal(t.ttftMs, 10);
    assert.deepEqual(t.usage, { input: 10, cachedInput: null, output: 8, reasoning: null });
  });

  test('xAI: max_completion_tokens; completion_tokens ei sisalda mõtlemist → output = completion + reasoning', async () => {
    // Näide xAI Chat Completions dokumentatsioonist: 32 + 9 + 94 = 135.
    const usage = {
      prompt_tokens: 32, completion_tokens: 9, total_tokens: 135,
      prompt_tokens_details: { cached_tokens: 6 }, completion_tokens_details: { reasoning_tokens: 94 },
    };
    const { saada, paringud } = loo('xai', [{ body: openaiStriim({ mudel: 'grok-4.7', usage }) }]);
    const t = await saada(SONUM);

    assert.equal(paringud[0].url, 'https://api.x.ai/v1/chat/completions');
    assert.deepEqual(Object.keys(paringud[0].body).sort(), ['max_completion_tokens', 'messages', 'model', 'stream', 'stream_options']);
    assert.deepEqual(t.usage, { input: 32, cachedInput: 6, output: 103, reasoning: 94 });
    assert.equal(t.usage.input + t.usage.output, usage.total_tokens);
  });

  test('pikkuse tõttu katkenud vastus on tavaline tulemus (finishReason length)', async () => {
    const usage = { prompt_tokens: 5, completion_tokens: 16000, total_tokens: 16005 };
    const { saada } = loo('openai', [{ body: openaiStriim({ mudel: 'gpt-6.1-terra', usage, lopp: 'length' }) }]);
    const t = await saada(SONUM);
    assert.equal(t.finishReason, 'length');
  });

  test('tühi vastus: tekst on tühi ja ttftMs null', async () => {
    const usage = { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 };
    const { saada } = loo('openai', [{ body: openaiStriim({ mudel: 'gpt-6.1-terra', usage, sisu: [''] }) }]);
    const t = await saada(SONUM);
    assert.equal(t.text, '');
    assert.equal(t.ttftMs, null);
    assert.equal(typeof t.totalMs, 'number');
  });

  test('usage puudub → usage väljad null, vastus alles', async () => {
    const baas = { id: 'c1', object: 'chat.completion.chunk', created: 1, model: 'gpt-6.1-terra' };
    const body = sse([{ ...baas, choices: [{ index: 0, delta: { content: 'X' }, finish_reason: 'stop' }] }, '[DONE]']);
    const { fetch } = voltsFetch([{ body }]);
    const saada = looAdapter(MUDEL.openai, { env: ENV, maxValjund: 16000, fetch });
    const t = await saada(SONUM);
    assert.equal(t.text, 'X');
    assert.equal(t.usageRaw, null);
    assert.deepEqual(t.usage, { input: null, cachedInput: null, output: null, reasoning: null });
  });

  for (const [status, korratav] of [[429, true], [500, true], [503, true], [400, false], [401, false], [404, false]]) {
    test(`HTTP ${status} → ApiViga, korratav=${korratav}, SDK ei korda`, async () => {
      const { saada, paringud } = loo('openai', [{ status, body: JSON.stringify({ error: { message: 'viga', type: 'x' } }) }]);
      await assert.rejects(saada(SONUM), (e) => e instanceof ApiViga && e.status === status && e.korratav === korratav);
      assert.equal(paringud.length, 1);
    });
  }

  test('ühenduse viga → ApiViga, status null, korratav', async () => {
    const fetch = async () => { throw new TypeError('fetch failed'); };
    const saada = looAdapter(MUDEL.xai, { env: ENV, maxValjund: 16000, fetch });
    await assert.rejects(saada(SONUM), (e) => e instanceof ApiViga && e.status === null && e.korratav === true);
  });
});

// --- Anthropic ---

function anthropicStriim({ tekst = ['Tal', 'linn'], stopReason = 'end_turn', algusUsage, loppUsage, mudel = 'claude-sonnet-5-5' }) {
  return sse([
    {
      type: 'message_start',
      message: {
        id: 'msg_1', type: 'message', role: 'assistant', model: mudel, content: [],
        stop_reason: null, stop_sequence: null, usage: algusUsage,
      },
    },
    { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'abc' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
    ...tekst.map((t) => ({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: t } })),
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: loppUsage },
    { type: 'message_stop' },
  ], { nimetatud: true });
}

describe('anthropic', () => {
  const algusUsage = { input_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 100, output_tokens: 1 };
  const loppUsage = { output_tokens: 57, output_tokens_details: { thinking_tokens: 40 } };

  test('päringus on ainult mudel, max_tokens, üks kasutajasõnum ja stream', async () => {
    const { saada, paringud } = loo('anthropic', [{ body: anthropicStriim({ algusUsage, loppUsage }) }]);
    const t = await saada(SONUM);

    assert.equal(paringud.length, 1);
    assert.equal(paringud[0].url, 'https://api.anthropic.com/v1/messages');
    assert.deepEqual(paringud[0].body, {
      model: 'claude-sonnet-5-5',
      max_tokens: 16000,
      messages: [{ role: 'user', content: SONUM }],
      stream: true,
    });
    assert.equal(t.text, 'Tallinn');
    assert.equal(t.modelVersion, 'claude-sonnet-5-5');
    assert.equal(t.finishReason, 'end_turn');
    // Kogu sisend = input_tokens + vahemälust loetud + vahemällu kirjutatud.
    assert.deepEqual(t.usage, { input: 120, cachedInput: 100, output: 57, reasoning: 40 });
    assert.equal(t.usageRaw.output_tokens, 57);
    // Mõtlemisplokk ei loe: TTFT on esimese text_delta aeg.
    assert.equal(t.ttftMs, 10);
    assert.equal(t.totalMs, 20);
  });

  test('keeldumine on tavaline tulemus (stop_reason refusal)', async () => {
    const { saada } = loo('anthropic', [{ body: anthropicStriim({ tekst: [], stopReason: 'refusal', algusUsage, loppUsage: { output_tokens: 3 } }) }]);
    const t = await saada(SONUM);
    assert.equal(t.finishReason, 'refusal');
    assert.equal(t.text, '');
    assert.equal(t.ttftMs, null);
    assert.equal(t.usage.reasoning, null);
  });

  for (const [status, korratav] of [[429, true], [529, true], [500, true], [400, false]]) {
    test(`HTTP ${status} → ApiViga, korratav=${korratav}, SDK ei korda`, async () => {
      const body = JSON.stringify({ type: 'error', error: { type: 'x', message: 'viga' } });
      const { saada, paringud } = loo('anthropic', [{ status, body }]);
      await assert.rejects(saada(SONUM), (e) => e instanceof ApiViga && e.status === status && e.korratav === korratav);
      assert.equal(paringud.length, 1);
    });
  }

  test('viga striimi keskel (overloaded_error) → korratav ApiViga', async () => {
    const body = sse([
      { type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null, usage: algusUsage } },
      { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } },
    ], { nimetatud: true });
    const { saada } = loo('anthropic', [{ body }]);
    await assert.rejects(saada(SONUM), (e) => e instanceof ApiViga && e.korratav === true);
  });
});

// --- Google ---

function googleStriim({ tykid, usage, mudel = 'gemini-3.8-flash', lopp = 'STOP' }) {
  return sse(tykid.map((tekst, i) => {
    const viimane = i === tykid.length - 1;
    return {
      candidates: [{
        content: { role: 'model', parts: tekst === null ? [] : [{ text: tekst }] },
        index: 0,
        ...(viimane ? { finishReason: lopp } : {}),
      }],
      usageMetadata: viimane ? usage : { promptTokenCount: usage.promptTokenCount },
      modelVersion: mudel,
      responseId: 'r1',
    };
  }));
}

describe('google', () => {
  const usage = {
    promptTokenCount: 214, cachedContentTokenCount: 192, candidatesTokenCount: 17,
    thoughtsTokenCount: 40, totalTokenCount: 271,
  };

  test('päringus on ainult sisu ja maxOutputTokens; SDK ei saada automaticContinuation-it', async () => {
    const { saada, paringud } = loo('google', [{ body: googleStriim({ tykid: ['Tal', 'linn'], usage }) }]);
    const t = await saada(SONUM);

    assert.equal(paringud.length, 1);
    assert.match(paringud[0].url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:streamGenerateContent\?alt=sse$/);
    assert.deepEqual(paringud[0].body, {
      contents: [{ role: 'user', parts: [{ text: SONUM }] }],
      generationConfig: { maxOutputTokens: 16000 },
    });
    assert.equal(t.text, 'Tallinn');
    assert.equal(t.modelVersion, 'gemini-3.8-flash');
    assert.equal(t.finishReason, 'STOP');
    // Väljund = candidates + thoughts.
    assert.deepEqual(t.usage, { input: 214, cachedInput: 192, output: 57, reasoning: 40 });
    assert.equal(t.usage.input + t.usage.output, usage.totalTokenCount);
    assert.deepEqual(t.usageRaw, usage);
    assert.equal(t.ttftMs, 10);
    assert.equal(t.totalMs, 20);
  });

  test('tühi esimene tükk ei loe TTFT-ks; MAX_TOKENS on tavaline tulemus', async () => {
    const { saada } = loo('google', [{ body: googleStriim({ tykid: [null, 'A'], usage, lopp: 'MAX_TOKENS' }) }]);
    const t = await saada(SONUM);
    assert.equal(t.text, 'A');
    assert.equal(t.ttftMs, 10);
    assert.equal(t.finishReason, 'MAX_TOKENS');
  });

  test('vahemälu ja mõtete väljad puuduvad → null', async () => {
    const u = { promptTokenCount: 10, candidatesTokenCount: 3, totalTokenCount: 13 };
    const { saada } = loo('google', [{ body: googleStriim({ tykid: ['A'], usage: u }) }]);
    const t = await saada(SONUM);
    assert.deepEqual(t.usage, { input: 10, cachedInput: null, output: 3, reasoning: null });
  });

  for (const [status, korratav] of [[429, true], [503, true], [400, false]]) {
    test(`HTTP ${status} → ApiViga, korratav=${korratav}, SDK ei korda`, async () => {
      const body = JSON.stringify({ error: { code: status, message: 'viga', status: 'X' } });
      const { saada, paringud } = loo('google', [{ status, body }]);
      await assert.rejects(saada(SONUM), (e) => e instanceof ApiViga && e.status === status && e.korratav === korratav);
      assert.equal(paringud.length, 1);
    });
  }
});

// --- Üldine ---

describe('looAdapter', () => {
  test('API-võti puudub → selge viga enne päringut', () => {
    assert.throws(() => looAdapter(MUDEL.openai, { env: {}, maxValjund: 16000 }), /OPENAI_API_KEY/);
  });

  test('tundmatu adapter → viga', () => {
    assert.throws(() => looAdapter({ id: 'x', adapter: 'puudub' }, { maxValjund: 1 }), /tundmatu adapter/);
  });

  test('fake: deterministlik vastus ja sama kuju mis päris adapteritel', async () => {
    const saada = looAdapter({ id: 'openai', adapter: 'fake', model: 'gpt-6.1-terra' });
    const a = await saada(SONUM);
    const b = await saada(SONUM);
    assert.deepEqual(a, b);
    assert.deepEqual(Object.keys(a).sort(), ['finishReason', 'modelVersion', 'text', 'totalMs', 'ttftMs', 'usage', 'usageRaw']);
    assert.deepEqual(Object.keys(a.usage).sort(), ['cachedInput', 'input', 'output', 'reasoning']);
  });

  test('fake: etteantud viga visatakse ApiViga-na', async () => {
    const saada = looAdapter({ id: 'x', adapter: 'fake' }, { viga: () => new ApiViga('429', { status: 429, korratav: true }) });
    await assert.rejects(saada(SONUM), (e) => e instanceof ApiViga && e.status === 429);
  });
});

describe('config/models.json', () => {
  test('viis mudelit CLAUDE.md tabeli järgi, max väljund 16 000', () => {
    assert.equal(SEADISTUS.maxOutputTokens, 16000);
    assert.deepEqual(
      SEADISTUS.models.map((m) => [m.id, m.adapter, m.model]),
      [
        ['openai', 'openaiCompatible', 'gpt-6.1-terra'],
        ['anthropic', 'anthropic', 'claude-sonnet-5-5'],
        ['google', 'google', 'gemini-3.8-flash'],
        ['deepseek', 'openaiCompatible', 'deepseek-flash'],
        ['xai', 'openaiCompatible', 'grok-4.7'],
      ],
    );
  });

  test('igal mudelil on võtmemuutuja .env.example failis ja baseURL', () => {
    const naide = fs.readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
    for (const m of SEADISTUS.models) {
      assert.match(naide, new RegExp(`^${m.apiKeyEnv}=`, 'm'), m.id);
      assert.ok(m.baseURL, m.id);
      if (m.adapter === 'openaiCompatible') {
        assert.ok(['max_tokens', 'max_completion_tokens'].includes(m.maxTokensParam), m.id);
        assert.equal(typeof m.completionIncludesReasoning, 'boolean', m.id);
      }
    }
  });
});
