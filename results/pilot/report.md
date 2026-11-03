# Pilot run report (PLAN.md phase 5)

Run: `pilot`, 3.11.2026, 5 models × 120 tasks × 1 repeat. The numbers come from `report_data.md` in this folder (`node src/report/pilot.js --run pilot`). The pilot data is not used in the main comparison.

## 1. Measurement

- **600 of 600 requests answered.** 0 errors, 0 retries, 0 truncated answers (finishReason length / max_tokens), 0 empty answers. Two answers came close to the limit of 16,000 output tokens (see F8).
- **Time:** 44 minutes, one request at a time. Median total latency per model 1.7–5.3 s.
- **Cost (costBilled):** $1.14 in total (costCriterion $1.35).

| model | costBilled pilot | estimate main run (×5) | correctness | format |
|---|---|---|---|---|
| openai (gpt-6.1-terra) | $0.073 | $0.37 | 0.971 | 0.983 |
| anthropic (claude-sonnet-5-5) | $0.192 | $0.96 | 0.883 | 0.875 |
| google (gemini-3.8-flash) | $0.374 | $1.87 | 0.969 | 0.992 |
| deepseek (deepseek-flash) | $0.038 | $0.19 | 0.983 | 0.992 |
| xai (grok-4.7) | $0.467 | $2.33 | 0.982 | 0.992 |

- **Estimate for the main run:** about $5.7 and 3.6 hours of request time. Every account is prepaid with about $4.50, so each has a margin of at least 1.9× (xAI).
- Gemini is the second most expensive model despite its low prices, because it thinks the most: 769 reasoning tokens per answer on average (DeepSeek 441, xAI 446, Terra 57, Sonnet 58).

## 2. Judge

- 40 answers × 3 = 120 scores in 9.7 minutes on the Pro subscription; the usage limit was not reached.
- 0 invalid answers, 0 missing scores; every answer came from `claude-opus-5-5` (Claude Code 2.1.317).
- The 3 scores of every file were identical (40 of 40).
- Distribution: 117 × 2, 3 × 1, no 0. The only 1 (one file, three times) is a Gemini answer to K3-035 that dropped the word "statistiliselt"; the rubric gives exactly 1 for that.
- The author's review: `judge_check.md` (20 files, without model names).

## 3. Findings for the author's decision

PLAN.md phase 5 allows changing only faulty tasks, faulty code and the judge level.

**Where** gives the place of each finding. A raw row is one line of `results/raw/pilot.jsonl`; in VS Code, Ctrl+G and the line number goes to it (turn on word wrap with Alt+Z). The task bank is `data/task_bank_v1_3.json`; a line number there is the line of the task's `"id"`.

**F1. K1-011: the reference looks wrong.** The text says that the customer was not at home and the parcel was taken to a parcel machine; the question is "Kas klient sai paki isiklikult kätte? Vasta: jah / ei / ei selgu". The reference is "ei". All five models answered "ei selgu" (Sonnet with an explanation), arguing that the customer may have collected the parcel from the machine personally. Both readings are possible, so the task does not have one clear answer.
- *Where:* task bank line 366 (K1-011, `check.allowed: ["ei"]`); answers: raw rows 51–55. Sonnet's answer: "**Ei selgu.** Tekstist selgub, et klient ei olnud kodus ja pakk viidi pakiautomaati. See ei näita siiski, kas klient läks hiljem pakile ise järele."
- *A change goes into:* the task (`input`, `instruction` or `check.allowed`) and a new item 1.13 in `data/CHANGES_v1_3.md`.

**F2. K1 format depends on the content.** M3 defines K1 format as "the answer is one of the allowed answers", and the task bank's `allowed` list holds the correct answers. So a well-formed wrong answer also gets format 0: in K1-011, four models answered exactly in the requested form ("ei selgu" is one of the three options in the instruction) and got format 0. In the pilot this affects only K1-011; in general K1 format = "correct and without decoration".
- *Where:* `src/checkers/k1.js` lines 8 and 14 (format) and 15 (correctness); the rule in words: CLAUDE.md, "Scoring rules (phase 3)", and M3 in `kavandi_tooplaan.xlsx`.
- *Note:* defining K1 format without the content would need, for every K1 task, the list of answers that have the right form (e.g. "jah / ei / ei selgu"); the task bank does not have such a list.

**F3. Sonnet adds Markdown and explanations to K1 answers.** Examples: "**47**", "Koosolek lõpeb kell **15.30**.", "**Ei.** Saaremaa on suursaar, …", although the instruction says e.g. "Vasta ühe sõnaga". 13 of its 40 K1 answers have format 0, which is right. Their correctness is also 0, because the normalization neither removes `**` nor finds an answer inside a sentence: the content is right in several of them. Sonnet's correctness is therefore 0.883 against 0.97–0.98 for the others, mostly for format reasons. Only one case ("**47**") would become correct by removing the Markdown marks; the rest are full sentences.
- *Where:* Sonnet's 13 K1 answers with format 0: K1-002, -005, -007, -011, -017, -021, -022, -025, -027, -031, -033, -034, -038 (`results/scored/pilot.jsonl`, `"modelId":"anthropic"`, `"format":0`). Examples: raw row 7 (K1-002 "**47**"), 22 (K1-005 "Koosolek lõpeb kell **15.30**."), 82 (K1-017 "**Ei.** Saaremaa on suursaar, …").
- *A change goes into:* the normalization steps in `src/checkers/normalize.js` (`STEPS`, line 21) and the `check.normalize` list of the K1 tasks in the task bank (e.g. K1-002, line 172), plus an item in `data/CHANGES_v1_3.md`.

**F4. Ceiling effect.** Correctness is 0.88–0.98 for all models and the judge gave 2 in 117 of 120 scores, so the test set separates these models only a little. Min-max normalization stretches small differences to the full 0…1 scale. This is not a fault (the test set may not be changed for it); it is a topic for the discussion chapter.
- *Where:* `report_data.md` ("Per model", "Judge"); the scores: `results/scored/pilot.jsonl`, `results/judge/scores.jsonl`. Nothing to change.

**F5. xAI's hidden input.** Every xAI request has about 1,150 input tokens more than the others (e.g. 1,294 vs 54–89 for K1-001), probably a system prompt added on the server side, almost all of it read from cache. Its costCriterion ($0.676) is therefore much higher than its costBilled ($0.467). This is the provider's default behaviour and is measured as it is.
- *Where:* e.g. raw row 5 (K1-001, xAI: `"input":1294,"cachedInput":1152`); costs: `results/cost/pilot.jsonl`. Nothing to change; a sentence for the methodology or discussion chapter.

**F6. OpenAI cache writes.** In one long request (K2-033, 6,617 input tokens) OpenAI wrote 6,614 tokens to cache at the cache write price, so OpenAI's costBilled ($0.0731) is a little higher than its costCriterion ($0.0714). This is correct according to the price list.
- *Where:* raw row 361 (K2-033, OpenAI: `"cache_write_tokens":6614`); the formula: `src/cost/cost.js`. Nothing to change.

**F7. Answers that are scored correctly but are worth knowing:** Sonnet "thought aloud" in K2-040 (a JSON, then a correction in English, then a second JSON) → format 0, correctness 0; Sonnet's K3-017 summary has 32 words with a limit of 30 → format 0. OpenAI put "-" instead of null for a missing phone number (K2-024) → one null violation.
- *Where:* raw rows 397 (K2-040, Sonnet), 482 (K3-017, Sonnet), 316 (K2-024, OpenAI: `"telefon":"-"`). Nothing to change.

**F8. Two answers came close to the output limit.** Gemini on K2-027 used 15,403 of 16,000 output tokens (15,359 of them reasoning, 135 s) and DeepSeek on K3-018 used 12,664 (12,631 reasoning, 58 s). Both finished normally (STOP / stop) with a correct answer. The next largest was 4,880. In the main run, with 5 repeats, such an answer may hit the limit; a truncated answer is a normal answer and is counted separately [PK1, L3]. K2-027 is the payment text without a year ("12. märtsil"), where the date must be null.
- *Where:* raw rows 333 (K2-027, Gemini: `"reasoning":15359`) and 489 (K3-018, DeepSeek: "TÄPSELT 10 sõnaga"); tasks: task bank lines 1716 (K2-027) and 2634 (K3-018); the limit: `config/models.json` line 2 (`"maxOutputTokens": 16000`).

## 4. Decisions needed before the freeze (tag `main-run`)

1. **K1-011 (F1):** accept "ei selgu" as a correct answer / change the text so that the answer is clear / leave it.
2. **K1 format (F2):** keep the definition of M3 / define K1 format without the content.
3. **Markdown in K1 (F3):** keep the strict comparison / add a normalization step that removes Markdown emphasis marks before the comparison (correctness only; the format stays 0).
4. **Judge level:** keep effort medium (the judge was consistent and followed the rubric) / raise to high (`src/judge/claude.js` line 24; the one score 1: judge file `results/judge/input/H9391.json`, K3-035).
5. **Output limit (F8):** keep 16,000 (L3; phase 5 does not list it among the things that may change) and count truncated answers / raise it.
6. **Review:** the author checks the 20 rule scores (`results/scored/pilot.manual_check.md`) and the 20 judge scores (`judge_check.md`).

Before the main run also, according to `kavandi_tooplaan.xlsx`: confirm the stability metric with the supervisor [M6] and write the usability criterion into the methodology chapter [E2].

## 5. The author's decisions (3.11.2026)

- **F1:** K1-011 stays as it is, reference "ei": the customer did not receive the parcel personally, it had to be collected from the parcel machine, which someone else (e.g. an acquaintance) may also have done. All five models answering "ei selgu" is kept as an example for the discussion and the defence (asked from the supervisor).
- **F2:** the K1 format definition of M3 stays; the methodology chapter says that K1 format includes correctness.
- **F3:** the strict comparison stays. Sonnet's Markdown and explanations are a result of format compliance, not a scoring fault.
- **F4:** a topic for the discussion chapter.
- **F5:** no change (provider default). The hidden input makes xAI more expensive and so lowers its aggregate score; described in the thesis (asked from the supervisor).
- **F6, F7:** no change.
- **F8:** the output limit stays 16,000 [L3]; truncated answers in the main run are normal answers and are counted separately [PK1].
- **Judge:** effort medium stays.
- **Review (3.11.2026):** the author checked the 20 rule scores (`results/scored/pilot.manual_check.md`): all 20 correct. The author scored the 20 judge files blind (`judge_check.md`): own score 2 in all 20, the same as the judge's median, and the judge's scores were right in all 20. Because of the ceiling effect (F4) the random samples held only full scores, so they confirm that full scores were deserved; the low scores are discussed in F1–F3 and F7.
- **Still open before the tag `main-run`:** the supervisor's answer on the stability metric [M6] and the research questions [S1]; the usability criterion in the methodology chapter [E2].
