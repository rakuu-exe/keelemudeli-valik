// JSON schemas of category 2 (data/category2_schemas.json → data/schemas/*.schema.json).
// Each schema is compiled once and cached: the schemas have an $id, and compiling the same schema
// again would fail with "schema already exists".
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

export const DATA_DIR = new URL('../../data/', import.meta.url);

// Returns validatorFor(taskId) → validate(value) → boolean.
export function createSchemaValidators(bank, dataDir = DATA_DIR) {
  const register = JSON.parse(fs.readFileSync(new URL(bank.json_schema_register, dataDir), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const cache = new Map();
  return function validatorFor(taskId) {
    if (!cache.has(taskId)) {
      const file = register.schemas[taskId];
      if (!file) throw new Error(`${taskId}: no JSON schema in ${bank.json_schema_register}`);
      cache.set(taskId, ajv.compile(JSON.parse(fs.readFileSync(new URL(file, dataDir), 'utf8'))));
    }
    return cache.get(taskId);
  };
}
