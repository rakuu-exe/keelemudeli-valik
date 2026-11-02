// Counting and language check tests, using the examples from the task bank definitions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords, countSentences, isInLanguage } from '../src/checkers/text.js';
import { loadTaskBank } from '../src/taskBank.js';

const lc = loadTaskBank().language_check;

test('word: the definition examples are one word each', () => {
  for (const s of ['2,4', 'e-post', '2025-09-10', 'kaia@naidis.ee']) assert.equal(countWords(s), 1, s);
  assert.equal(countWords('  üks   kaks kolm\nneli  '), 4);
  assert.equal(countWords(''), 0);
});

test('sentence: protected constructs do not end a sentence', () => {
  assert.equal(countSentences('Hind tõusis 2.4 protsenti ja kulu 2,4 miljonit.'), 1);
  assert.equal(countSentences('Kirjuta aadressile kaia@naidis.ee. Vastame kiiresti.'), 2);
  assert.equal(countSentences('Vaata https://naidis.ee/a.b lehte. Seal on kõik.'), 2);
  assert.equal(countSentences('Kontor asub Tartu mnt. 12, nt. bussiga jne. lihtne.'), 1);
  assert.equal(countSentences('Mida?! Ei usu...'), 2);
  assert.equal(countSentences('Esimene rida\njätkub siin.'), 1);
  assert.equal(countSentences('Lõpus pole punkti'), 1);
});

// et2 and en1 were misidentified by franc when choosing among all languages (pam, sco);
// see data/CHANGES_v1_3.md, item 1.10.
test('language: franc identifies Estonian as ekk and tells it apart from English', () => {
  const et1 = 'Uuringus ei leitud kohvitarbimise ja unehäirete vahel statistiliselt olulist seost.';
  const et2 = 'Teises kvartalis kasvas müük 8 protsenti ning samal perioodil käivitati ka uus reklaamikampaania.';
  const en1 = 'The study found no statistically significant link between coffee and sleep.';
  assert.ok(isInLanguage(et1, 'et', lc));
  assert.ok(isInLanguage(et2, 'et', lc));
  assert.ok(!isInLanguage(en1, 'et', lc));
  assert.ok(isInLanguage(en1, 'en', lc));
  assert.ok(!isInLanguage(et2, 'en', lc));
});

// The heuristic is exclusionary: a short text is Estonian if it contains none of the listed English words,
// and English if it contains no Estonian accented letters and none of the listed Estonian words.
test('language: short output uses the heuristic', () => {
  assert.ok(isInLanguage('Tartus avati uus raamatukogu.', 'et', lc));
  assert.ok(!isInLanguage('This is a new library.', 'et', lc));
  assert.ok(isInLanguage('New library opened in Tartu.', 'en', lc));
  assert.ok(!isInLanguage('Raamatukogu avati möödunud reedel.', 'en', lc));
  assert.ok(!isInLanguage('Library ja raamatukogu.', 'en', lc));
});
