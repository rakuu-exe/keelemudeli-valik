// Loendamise ja keelekontrolli testid ülesandepanga definitsioonide näidetega.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loeSonad, loeLaused, onKeeles } from '../src/checkers/tekst.js';
import { laePank } from '../src/pank.js';

const kk = laePank().keele_kontroll;

test('sõna: definitsiooni näited on üks sõna', () => {
  for (const s of ['2,4', 'e-post', '2025-09-10', 'kaia@naidis.ee']) assert.equal(loeSonad(s), 1, s);
  assert.equal(loeSonad('  üks   kaks kolm\nneli  '), 4);
  assert.equal(loeSonad(''), 0);
});

test('lause: kaitstud konstruktsioonid ei lõpeta lauset', () => {
  assert.equal(loeLaused('Hind tõusis 2.4 protsenti ja kulu 2,4 miljonit.'), 1);
  assert.equal(loeLaused('Kirjuta aadressile kaia@naidis.ee. Vastame kiiresti.'), 2);
  assert.equal(loeLaused('Vaata https://naidis.ee/a.b lehte. Seal on kõik.'), 2);
  assert.equal(loeLaused('Kontor asub Tartu mnt. 12, nt. bussiga jne. lihtne.'), 1);
  assert.equal(loeLaused('Mida?! Ei usu...'), 2);
  assert.equal(loeLaused('Esimene rida\njätkub siin.'), 1);
  assert.equal(loeLaused('Lõpus pole punkti'), 1);
});

// et2 ja en1 tuvastas franc kõigi keelte seast valides valesti (pam, sco); vt data/MUUDATUSED_v1_3.md p 2.1.
test('keel: franc tunneb eesti keele koodiga ekk ja eristab inglise keelest', () => {
  const et1 = 'Uuringus ei leitud kohvitarbimise ja unehäirete vahel statistiliselt olulist seost.';
  const et2 = 'Teises kvartalis kasvas müük 8 protsenti ning samal perioodil käivitati ka uus reklaamikampaania.';
  const en1 = 'The study found no statistically significant link between coffee and sleep.';
  assert.ok(onKeeles(et1, 'et', kk));
  assert.ok(onKeeles(et2, 'et', kk));
  assert.ok(!onKeeles(en1, 'et', kk));
  assert.ok(onKeeles(en1, 'en', kk));
  assert.ok(!onKeeles(et2, 'en', kk));
});

// Heuristika on välistav: lühike tekst on eestikeelne, kui selles pole loendi ingliskeelseid sõnu,
// ja ingliskeelne, kui selles pole täpitähti ega loendi eestikeelseid sõnu.
test('keel: lühike väljund kasutab heuristikat', () => {
  assert.ok(onKeeles('Tartus avati uus raamatukogu.', 'et', kk));
  assert.ok(!onKeeles('This is a new library.', 'et', kk));
  assert.ok(onKeeles('New library opened in Tartu.', 'en', kk));
  assert.ok(!onKeeles('Raamatukogu avati möödunud reedel.', 'en', kk));
  assert.ok(!onKeeles('Library ja raamatukogu.', 'en', kk));
});
