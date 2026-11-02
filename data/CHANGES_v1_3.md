# Task bank v1.2 → v1.3: change log

**Dates:** 1.11.2026 (content changes, items 1.1–1.10), 2.11.2026 (English structure, item 1.11)
**Files:** `task_bank_v1_2.json` (original, unchanged) → `task_bank_v1_3.json`
**Check:** `npm run check` (all tests pass)

The number of tasks, the categories and the difficulty levels did not change: 120 tasks, 40 in each category (difficulty levels 10/15/15). There are still 8 judge tasks. The category 2 JSON schemas (`schemas/`, `category2_schemas.json`) did not change in content; only their titles and descriptions were translated (item 1.11).

Tags in brackets (e.g. [L2]) refer to the decisions in `kavandi_tooplaan.xlsx`.

Field names below are the v1.3 (English) names. The mapping to the v1.2 names is in item 1.11.

---

## 1. Changes decided by the author

### 1.1 System prompt removed [L2, L3]

- **What:** `measurement.system_prompt` ("Oled abiline, kes täidab ülesandeid täpselt…") and the note about fixing the thinking mode were removed. They were replaced by the fields `request` and `settings`.
- **Why:** every request is one user message and every model runs with the provider's default settings, as stated in the preconditions of the thesis proposal. Every task instruction states the required answer form itself, so no system prompt is needed. The thinking mode is not fixed: the only parameter sent is the maximum output length of 16,000 tokens.

### 1.2 User message template added [L2]

- **What:** new block `user_message_template`:
  - K1 and K3: `Tekst:\n{input}\n\n{instruction}`
  - K2: `Tekst:\n{input}\n\nSkeem:\n{schema}\n\n{instruction}`
- **Why:** v1.2 did not specify how the parts of a task are combined into one message. The template does that without changing the tasks themselves.
- **Detail:** `{schema}` is the value of the task field `schema` as JSON with 2-space indentation.

### 1.3 Language code `est` → `ekk` [L4]

- **What:** `language_check.long_output` now states that the code for Estonian is `ekk`. The field `franc_codes` was added (`et` → `ekk`, `en` → `eng`).
- **Why:** franc uses ISO 639-3 codes and returns `ekk` (Standard Estonian) for Estonian, not the macrolanguage code `est`. With `est`, no answer would ever have passed the language check.

### 1.4 Regexes: Python `(?i)` replaced by a flag [L4]

- **What:** 9 regexes started with the Python syntax `(?i)`. It was removed and case-insensitivity is now in the field `"flags": "i"`. Changed tasks: K3-014, K3-019, K3-021, K3-024, K3-038, K3-040 (2 regexes), K3-030 and K3-032. The last two also got word boundaries (item 1.5).
- **Why:** JavaScript does not support an inline `(?i)` flag for the whole pattern, and `new RegExp('(?i)…')` throws an error.
- **Also:** `check_types.rules` now describes the fields `flags` and `whole_word`.

### 1.5 Word boundaries in tasks K3-032 and K3-030 [L4]

- **What:** the rule got `"whole_word": true` and `"flags": "iu"`. The pattern is wrapped as `(?<![\p{L}\p{N}])(?:pattern)(?![\p{L}\p{N}])`.
- **Why:** the v1.2 patterns searched for substrings and gave false positives: "kolm" matched "kolmapäeval", "üks" matched "ükski", "juht" matched "juhtisid". JavaScript `\b` does not work here, because it does not treat accented letters as letters: `/\büks\b/i.test("üks")` returns `false`. The Unicode letter class `\p{L}` needs the flag `u`.

### 1.6 K3-032: source text and forbidden number words [L4]

- **Source text:**
  - "Ettevõte **viis läbi** kliendiküsitluse" → "Ettevõte **korraldas** kliendiküsitluse"
  - "Küsitlus **viidi läbi** e-posti teel märtsis." → "Küsitlus **toimus** e-posti teel märtsis."
- **Why:** the task forbids number words, including "viis" (five). In the source text "viis" was a verb ("viis läbi", carried out), so a correct answer that reused the wording of the source text failed the rule. A word boundary does not solve this, because the verb is a whole word.
- **New pattern:** besides the base forms, it also catches inflected number words: ühe, kahe, kolme, viie, üheksast, kolmandik… etc. The exception is `viis(?!\s+läbi)`: the verb "viis läbi" is not counted as a number word.
- **Other tasks:** tasks K3-005, K3-008, K3-019 and K3-026 use the same source text, which was not changed there. Their rules do not forbid number words.

### 1.7 K3-030: job title pattern [L4]

- **What:** `(juht|tegevjuht|direktor|CEO)` was replaced by a whole-word pattern that also catches inflected forms: tegevjuh…, peadirektor…, direktor…, juhataja…, esimees/esimeh…, CEO and CEO-d, juht, juhi, juhti, juhid, juhte, juhtide, juhil, juhile, juhilt, juhiga, juhina.
- **Why:**
  - the v1.2 substring "juht" gave a false positive on a verb ("Kasvu **juht**isid tellimusteenused"), which is the natural translation of "driven by" in the source text.
  - At the same time, the natural genitive form "**Tegevjuhi** sõnul…" (according to the CEO) was missed.

### 1.8 Judge instructions [L4, M2]

- **What:** `judge_instructions` got new fields:
  - `judge`: Claude Opus 5.5 via Claude Code, effort medium;
  - `tasks`: the list of 8 tasks;
  - `input`: the judge gets only the source text, the instruction, the rubric and the answer, and never sees the model name;
  - `correctness`: the median 0/1/2 is converted to correctness 0 / 0.5 / 1.
- **Unchanged:** the 0/1/2 scale, 3 scores and the median were already in v1.2.
- **Also:** in `check_types.judge`, the sentence "These tasks form the human evaluation sample" was replaced by "Judge-scored answers are part of the human evaluation sample". According to decision [M14], the human evaluation sample is 60 answers from all categories.

### 1.9 K3-005: participant count pattern made case-insensitive (author's decision 1.11.2026)

- **What:** the rule `regex_present` `(9|üheksa)` got `"flags": "i"`.
- **Why:** the pattern was case-sensitive. A correct answer starting with a capital letter ("Üheksast kliendist…") failed the rule.

### 1.10 franc chooses only between Estonian and English (author's decision 1.11.2026)

- **What:** `language_check.franc_candidates = ["ekk", "eng"]`. The language of an output of at least 8 words is determined between these two languages, not among all 187 languages of franc.
- **Why:** with default settings, franc misidentified 2 out of 40 different correct texts (the K3 sample answers of at least 8 words and two English test sentences):

  | Text | Correct | franc default |
  |---|---|---|
  | "Teises kvartalis kasvas müük 8 protsenti ning samal perioodil käivitati ka uus reklaamikampaania." (K3-028 sample answer) | ekk | pam (Pampanga) |
  | "The study found no statistically significant link between coffee and sleep." | eng | sco (Scots) |

  Choosing between the two languages gave 0 errors. The language check has to tell exactly these two languages apart, because the typical error in the test set is a model answering in the language of the input (English) instead of Estonian, or the other way round (K3-011, K3-017, K3-030, K3-038).

### 1.11 Structure in English (author's decision 2.11.2026)

- **What:** all keys, enum names and metadata of the task bank were translated into English, and the files were renamed (`ulesandepank_v1_*.json` → `task_bank_v1_*.json`, `kategooria2_skeemid.json` → `category2_schemas.json`, `MUUDATUSED_v1_3.md` → `CHANGES_v1_3.md`). The duplicate field `json_schema_fail` (same value as `json_schema`) was removed.
- **Unchanged (Estonian):** everything that reaches a model or the judge, or that answers are compared with: task inputs and instructions, the template text (`Tekst:`, `Skeem:`), references, allowed answers, rule values and regexes, K2 field names and type descriptions, `category2_general_instruction`, rubrics and the judge-facing guidance (`judge_instructions.principle`, `output_format`, `system_rules`), and the language check word lists.
- **Verification:** for all 120 tasks the user message is byte-for-byte identical before and after. The old and new scoring code gave identical results in 53,537 comparisons (messages, normalization, word and sentence counts, language check, all K3 rules on 587 candidate texts).
- **v1.2:** `task_bank_v1_2.json` is kept exactly as delivered (Estonian keys); only its file name changed.

  | v1.2 / early v1.3 | v1.3 |
  |---|---|
  | `versioon`, `kuupäev`, `keel`, `kirjeldus` | `version`, `date`, `language`, `description` |
  | `kontrollitüübid` | `check_types` |
  | `normaliseerimised` | `normalizations` |
  | `mõõtmisjuhis` (`kordusi`, `mõõda_ka`, `päring`, `seadistus`) | `measurement` (`repeats`, `also_measure`, `request`, `settings`) |
  | `kasutajasõnumi_mall` (`{sisend}`, `{juhis}`, `{skeem}`) | `user_message_template` (`{input}`, `{instruction}`, `{schema}`) |
  | `kategooria_2_üldjuhis` | `category2_general_instruction` |
  | `loendamise_definitsioonid` | `counting_definitions` |
  | `keele_kontroll` | `language_check` |
  | `kohtuniku_juhis` | `judge_instructions` |
  | `ülesanded` | `tasks` |
  | task: `kategooria`, `raskus`, `märgendid`, `sisend`, `juhis`, `märkus`, `skeem` | `category`, `difficulty`, `tags`, `input`, `instruction`, `note`, `schema` |
  | `kontroll` (`tuup`, `lubatud`, `normaliseeri`, `etalon`, `osaline_skoor`, `null_ootus`, `reeglid`, `rubriik`, `lisareeglid`) | `check` (`type`, `allowed`, `normalize`, `reference`, `partial_score`, `expected_null`, `rules`, `rubric`, `extra_rules`) |
  | check types `tapne_vaste`, `json_valjad`, `reeglid`, `kohtunik` | `exact_match`, `json_fields`, `rules`, `judge` |
  | rule `{r, v, lipud, terve_sona}` | `{rule, value, flags, whole_word}` |
  | rules `max_sonu`, `min_sonu`, `sisaldab`, `ei_sisalda`, `keel`, `regex_olemas`, `regex_puudub`, `lausete_arv`, `reavahetusi_max` | `max_words`, `min_words`, `contains`, `not_contains`, `language`, `regex_present`, `regex_absent`, `sentence_count`, `max_line_breaks` |
  | normalizations `trim`, `vaiketahed`, `eemalda_lopupunkt`, `eemalda_koodiplokk`, `eemalda_eessona`, `kuupaev_iso`, `arv_punkt` | `trim`, `lowercase`, `strip_final_punctuation`, `strip_code_fence`, `strip_preamble`, `date_iso`, `decimal_point` |

---

## 2. Found but not changed

- **K3-026 note:** the note claims that some cases are also caught by the rule `regex_absent '(?i)(enamik|suurem osa|paljud)'`. The task has no such rule: the only extra rule of this judge task is `language`. The note does not affect scoring.

---

## 3. Check script

`test/taskBank.test.js` (`npm run check`) checks the following:

- **Structure:** 120 tasks, 40 in each category, difficulty levels 10/15/15, unique IDs, the 8 judge tasks.
- **v1.3 changes:** no system prompt, `ekk`, no `(?i)` left, all 16 regexes compile in Node.
- **Word boundary test cases (K3-032, K3-030):** each pattern matches every form it must match and none of the forms it must not match.
- **User message template:** the message builds for all 120 tasks and no placeholders remain.
- **K1:** every allowed answer stays allowed after normalization, also in the form "Vastus: X." with a capital letter.
- **K2:** the reference passes the JSON schema; the fields of the reference, the task schema and the JSON schema are the same. A missing field, an extra field, a wrong date form and a disallowed enum value fail (the checks of the v1.2 script `kontrolli_skeeme.mjs`).
- **K3:** every task has a sample answer (`test/fixtures/k3_sample_answers.json`) that passes the task's rules. For judge tasks it passes only the extra rules.
  - The sample answers are only for the check. They are never sent to the models and are not used in scoring.
  - The check shows that every rule set can be satisfied by a correct answer. This is exactly the check that would have caught the K3-032 error earlier.
