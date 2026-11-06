# Data (`data/`)

The structure (keys, rule names, descriptions) is in English; everything that reaches a model or the judge, or that answers are compared with, is in Estonian (CLAUDE.md, "Language").

## `data/task_bank_v1_3.json`
The test set: 120 Estonian tasks, 40 per category (K1 fact-based / classification, K2 structured data extraction, K3 text processing / summarizing), difficulty levels 1/3/5 with 10/15/15 tasks per category.

| top-level field | meaning |
|---|---|
| `user_message_template` | K1 and K3 `Tekst:\n{input}\n\n{instruction}`; K2 adds `Skeem:\n{schema}` [L2] |
| `measurement` | repeats, what is measured, the request and the provider-default settings |
| `check_types` | `exact_match` (K1), `json_fields` (K2), `rules` (K3), `judge` (8 K3 tasks) |
| `normalizations` | the K1 normalization steps |
| `counting_definitions` | word and sentence definitions used by the K3 rules |
| `language_check` | franc codes (Estonian = `ekk`), the threshold and the short-text word lists |
| `judge_instructions` | the judge tasks, input, correctness mapping, the judge-facing principle, output format (`score`, `justification`) and system rules |
| `json_schema_register` | the register file of the K2 schemas |
| `tasks` | `id`, `category`, `difficulty`, `tags`, `input`, `instruction`, (K2) `schema` and `json_schema`, `check` |

A task's `check`: K1 `allowed` + `normalize`; K2 `reference`, `expected_null`, `partial_score`; K3 `rules`, or for a judge task `rubric` + `extra_rules`. Read by `src/taskBank.js` and the [scoring](scoring.md) modules.

## `data/task_bank_v1_2.json`
The original v1.2 task bank as delivered (Estonian keys). Kept unchanged for reference; not used by the code.

## `data/CHANGES_v1_3.md`
Every change from v1.2 to v1.3 with what, why and the decision tag (system prompt removed, user message template, language code `ekk`, regex flags, word boundaries, judge instructions, English structure, judge answer keys in English, the reworded K1-011 question, …), and what was found but not changed.

## `data/category2_schemas.json`
The register of the K2 JSON schemas: `conventions` and `schemas` (task id → file under `data/`).

## `data/schemas/K2-*.schema.json`
One JSON schema (draft 2020-12) per K2 task: the fields, their types (each also allows `null`), `required` = all fields, `additionalProperties: false`, patterns for dates and enums. Used for K2 format compliance [M3]; compiled once by `src/checkers/schemas.js`.
