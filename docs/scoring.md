# Scoring (`src/checkers/`)

Every answer gets format (0/1) and correctness (0…1). The rules are in CLAUDE.md, "Scoring rules (phase 3)"; the decisions are tagged [M2, M3].

## `src/checkers/score.js`
```
node src/checkers/score.js --run <runId> [--dry-run]
```
Reads the raw rows and the judge set, writes `results/scored/<runId>.jsonl` again from them (derived data). Error rows get no score row. For the 8 judge tasks the correctness is the judge median / 2 (`null` while not judged). Prints a summary per model. Exports `createScorer(bank)` → `scoreAnswer(taskId, text)` (also used by the manual check and the report), `scoreRawRows`, `buildScoreRow`, `writeJsonl`.

## Per category
| file | rule |
|---|---|
| `src/checkers/k1.js` | format: one of the allowed answers ignoring surrounding whitespace, case and one final period; correctness: after the task's normalization steps |
| `src/checkers/k2.js` | format: `JSON.parse` of the unchanged answer + the JSON schema; correctness: share of correct top-level fields after removing code fences (`sameValue`: text normalized and case-insensitive, numbers as JSON numbers, null as null, lists in any order); `nullViolations` |
| `src/checkers/k3.js` | format: length and structure rules (`FORMAT_RULES`); correctness: share of content rules; judge tasks: format from the length rules of `extra_rules` only; an empty answer gets 0 and 0 |

## Helpers
| file | role |
|---|---|
| `src/checkers/rules.js` | `checkRule` / `checkRules`: `max_words`, `min_words`, `contains`, `not_contains`, `language`, `regex_present`, `regex_absent`, `sentence_count`, `max_line_breaks` |
| `src/checkers/text.js` | `countWords`, `countSentences` (protected decimals, emails, URLs, abbreviations), `isInLanguage` (franc between Estonian and English from 8 words; a word list heuristic below) |
| `src/checkers/normalize.js` | the K1 steps (`trim`, `lowercase`, `strip_final_punctuation`, `strip_code_fence`, `strip_preamble`, `date_iso`, `decimal_point`) and `normalize` |
| `src/checkers/regex.js` | `buildRegex(rule)`: flags, and `whole_word` with Unicode letter boundaries (JS `\b` does not know õ, ä, ö, ü) |
| `src/checkers/schemas.js` | `createSchemaValidators(bank)`: compiles each K2 schema once (Ajv 2020) and caches it |

## `src/checkers/sample.js`
```
node src/checkers/sample.js --run pilot [--n 20]
```
The author's manual check of rule scores (phase 3, done on the pilot data): 20 rule-scored answers drawn with seed 20261103, in turn from each category, with the answer unchanged, the reference or rules, the score and why → `results/scored/<runId>.manual_check.md`.
