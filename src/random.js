// Seeded randomness: the same seed always gives the same order and the same IDs
// (manual check sample, judge file IDs and their order).

// mulberry32: a small 32-bit PRNG. Returns a function that gives numbers in [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates shuffle into a new array.
export function shuffle(items, random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A 32-bit seed from a fixed number and a text (FNV-1a), e.g. a different order for every runId.
export function seedFrom(seed, text) {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
