// Adapteri valik mudeli seadistuse (config/models.json) välja "adapter" järgi.
// Uue mudeli lisamiseks piisab models.json reast, kui selle pakkujale on adapter olemas.
import { looOpenaiCompatible } from './openaiCompatible.js';
import { looAnthropic } from './anthropic.js';
import { looGoogle } from './google.js';
import { looFake } from './fake.js';

const ADAPTERID = {
  openaiCompatible: looOpenaiCompatible,
  anthropic: looAnthropic,
  google: looGoogle,
  fake: looFake,
};

// valikud: { env, maxValjund, fetch, kell } päris adapteritele; { vastus, viga } võltsadapterile.
export function looAdapter(mudel, valikud = {}) {
  const loo = ADAPTERID[mudel.adapter];
  if (!loo) throw new Error(`${mudel.id}: tundmatu adapter "${mudel.adapter}"`);
  if (mudel.adapter !== 'fake' && !Number.isInteger(valikud.maxValjund)) {
    throw new Error(`${mudel.id}: maxValjund puudub`);
  }
  return loo(mudel, valikud);
}

export { ApiViga } from './yhine.js';
