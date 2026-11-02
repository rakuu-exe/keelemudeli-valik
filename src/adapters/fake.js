// Võltsadapter testide ja --dry-run jaoks. Ei tee võrgupäringuid.
// Vastus on deterministlik: sama sõnum ja mudel annavad alati sama tulemuse.
import { ApiViga } from './yhine.js';

// valikud.vastus(sonum, mudel) → tekst; valikud.viga(sonum, mudel) → ApiViga või null.
export function looFake(mudel, { vastus, viga } = {}) {
  return async function saada(sonum) {
    const e = viga?.(sonum, mudel);
    if (e) throw e instanceof ApiViga ? e : new ApiViga(String(e));
    const tekst = vastus ? vastus(sonum, mudel) : `Võltsvastus (${mudel.id})`;
    const input = Math.ceil(sonum.length / 4);
    const output = Math.ceil(tekst.length / 4);
    const usageRaw = { input_tokens: input, output_tokens: output };
    return {
      text: tekst,
      modelVersion: `fake-${mudel.model ?? mudel.id}`,
      finishReason: 'stop',
      usage: { input, cachedInput: null, output, reasoning: null },
      usageRaw,
      ttftMs: 1,
      totalMs: 2,
    };
  };
}
