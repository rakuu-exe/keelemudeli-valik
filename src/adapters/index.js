// Adapter selection by the field "adapter" of the model config (config/models.json).
// Adding a model only needs a row in models.json if an adapter for its provider exists.
import { createOpenAICompatible } from './openaiCompatible.js';
import { createAnthropic } from './anthropic.js';
import { createGoogle } from './google.js';
import { createFake } from './fake.js';

const ADAPTERS = {
  openaiCompatible: createOpenAICompatible,
  anthropic: createAnthropic,
  google: createGoogle,
  fake: createFake,
};

// options: { env, maxOutputTokens, fetch, clock } for real adapters; { respond, fail } for the fake one.
export function createAdapter(model, options = {}) {
  const create = ADAPTERS[model.adapter];
  if (!create) throw new Error(`${model.id}: unknown adapter "${model.adapter}"`);
  if (model.adapter !== 'fake' && !Number.isInteger(options.maxOutputTokens)) {
    throw new Error(`${model.id}: maxOutputTokens is missing`);
  }
  return create(model, options);
}

export { ApiError } from './common.js';
