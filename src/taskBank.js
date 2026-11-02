// Loading the task bank and building the user message from the template.
import fs from 'node:fs';

export const TASK_BANK_FILE = new URL('../data/task_bank_v1_3.json', import.meta.url);

export function loadTaskBank(file = TASK_BANK_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// The template combines the input, the instruction and (category 2) the schema into one user message.
// Substitution is done in a single pass so that text in the input cannot turn into a placeholder.
export function buildUserMessage(task, bank) {
  const template = bank.user_message_template[`K${task.category}`];
  if (!template) throw new Error(`No template for category ${task.category}`);
  const values = {
    input: task.input,
    instruction: task.instruction,
    schema: task.schema === undefined ? undefined : JSON.stringify(task.schema, null, 2),
  };
  return template.replace(/\{(input|instruction|schema)\}/g, (_, name) => {
    if (values[name] === undefined) throw new Error(`${task.id}: no value for placeholder {${name}}`);
    return values[name];
  });
}
