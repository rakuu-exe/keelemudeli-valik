# Manual check of rule scores: pilot

20 score rows drawn with seed 20261103 (7 K1, 7 K2, 6 K3) from 560 rule-scored answers.
For each one: is the score right according to the task bank rules? Write "ok" or what is wrong after **Check:**.

## 1. K1-004 (K1, difficulty 1)

Key: `pilot|K1-004|openai|1`

**Instruction:** Kas pood on laupäeval avatud? Vasta: jah / ei

<details><summary>Source text</summary>

~~~text
Pood on avatud esmaspäevast reedeni. Nädalavahetusel on suletud.
~~~

</details>

**Allowed answers:** `ei`

**Normalization:** trim, lowercase, strip_final_punctuation

**Answer** (exactly as returned; finishReason stop):

~~~text
ei
~~~

**Score:** format 1 · correctness 1
- answer after normalization: `ei`

**Check:**  OK

## 2. K2-034 (K2, difficulty 5)

Key: `pilot|K2-034|xai|1`

**Instruction:** Eralda tekstist andmed ja tagasta AINULT JSON vastavalt skeemile. Ära lisa selgitusi ega koodiploki märgiseid. Kui mõnda välja tekstis ei ole, pane selle väärtuseks null. Tekstiväljad esita nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Saadetis: 5 kasti, igas 12 pakki, iga pakk 250 g.
~~~

</details>

**Expected JSON** (expected_null: none):
~~~text
{
  "kaste": 5,
  "pakke_kokku": 60,
  "kogukaal_kg": 15
}
~~~

**Answer** (exactly as returned; finishReason stop):

~~~text
{"kaste": 5, "pakke_kokku": 60, "kogukaal_kg": 15}
~~~

**Score:** format 1 · correctness 1
- wrong fields: none
- nullViolations: 0

**Check:** OK

## 3. K3-006 (K3, difficulty 1)

Key: `pilot|K3-006|openai|1`

**Instruction:** Kirjuta tekstile pealkiri. Maksimaalselt 8 sõna.

<details><summary>Source text</summary>

~~~text
Tallinnas toimunud tehnoloogiakonverentsil osales 127 inimest 14 riigist. Korraldajad teatasid, et järgmise aasta eelarve on 2,4 miljonit eurot. Konverentsi peaesineja oli Soome ettevõtte tehnoloogiajuht.
~~~

</details>


**Answer** (exactly as returned; finishReason stop):

~~~text
Tallinna tehnoloogiakonverents tõi kokku osalejad 14 riigist
~~~

**Score:** format 1 · correctness 1

| rule | value | counts for | passed |
|---|---|---|---|
| max_words | `8` | format | yes |
| language | `"et"` | correctness | yes |

**Check:** OK

## 4. K1-018 (K1, difficulty 3)

Key: `pilot|K1-018|google|1`

**Instruction:** Klassifitseeri tagasiside. Vasta täpselt ühega: POSITIIVNE / NEGATIIVNE / NEUTRAALNE

<details><summary>Source text</summary>

~~~text
Suurepärane, jälle üks uuendus, mis eemaldas nupu, mida ma iga päev kasutasin.
~~~

</details>

**Allowed answers:** `negatiivne`

**Normalization:** trim, lowercase, strip_final_punctuation

**Answer** (exactly as returned; finishReason STOP):

~~~text
NEGATIIVNE
~~~

**Score:** format 1 · correctness 1
- answer after normalization: `negatiivne`

**Check:** OK

## 5. K2-031 (K2, difficulty 5)

Key: `pilot|K2-031|deepseek|1`

**Instruction:** Eralda tekstist andmed ja tagasta AINULT JSON vastavalt skeemile. Ära lisa selgitusi ega koodiploki märgiseid. Kui mõnda välja tekstis ei ole, pane selle väärtuseks null. Tekstiväljad esita nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Tellija Kaire Lepp, e-post kaire@naidis.ee. Tarneaadress Tartu mnt 12, 10145 Tallinn. Tellimuses on 2 toodet: laadija 19 eurot ja kott 35 eurot.
~~~

</details>

**Expected JSON** (expected_null: none):
~~~text
{
  "tellija": {
    "nimi": "Kaire Lepp",
    "epost": "kaire@naidis.ee"
  },
  "aadress": {
    "tänav": "Tartu mnt 12",
    "sihtnumber": "10145",
    "linn": "Tallinn"
  },
  "tooted": [
    {
      "nimi": "laadija",
      "hind": 19
    },
    {
      "nimi": "kott",
      "hind": 35
    }
  ]
}
~~~

**Answer** (exactly as returned; finishReason stop):

~~~text
{"tellija":{"nimi":"Kaire Lepp","epost":"kaire@naidis.ee"},"aadress":{"tänav":"Tartu mnt 12","sihtnumber":"10145","linn":"Tallinn"},"tooted":[{"nimi":"laadija","hind":19},{"nimi":"kott","hind":35}]}
~~~

**Score:** format 1 · correctness 1
- wrong fields: none
- nullViolations: 0

**Check:** OK

## 6. K3-034 (K3, difficulty 5)

Key: `pilot|K3-034|google|1`

**Instruction:** Esita sisu täpselt kolme täpploendi reana. Iga rida peab algama tegusõnaga ja olema kuni 8 sõna. Kuupäev peab esinema.

<details><summary>Source text</summary>

~~~text
Tarkvara versioon 4.2 parandas 17 viga ja lisas kaks uut funktsiooni. Uuendus on tasuta kõigile olemasolevatele klientidele. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

</details>


**Answer** (exactly as returned; finishReason STOP):

~~~text
* Parandas 17 viga ja lisas kaks funktsiooni.
* Pakub tasuta uuendust kõigile olemasolevatele klientidele.
* Lõpeb vanemate versioonide tugi 1. juunil 2026.
~~~

**Score:** format 1 · correctness 1

| rule | value | counts for | passed |
|---|---|---|---|
| max_line_breaks | `4` | format | yes |
| regex_present | `^[-*•] (flags: -)` | correctness | yes |
| contains | `["2026"]` | correctness | yes |
| language | `"et"` | correctness | yes |

**Check:**  OK

## 7. K1-034 (K1, difficulty 5)

Key: `pilot|K1-034|deepseek|1`

**Instruction:** Kas graveeringuga tootel on tagastusõigus? Vasta: jah / ei

<details><summary>Source text</summary>

~~~text
Tagastusõigus ei kehti isikustatud toodetele. Isikustamiseks loetakse graveeringut või trükki tellija soovil.
~~~

</details>

**Allowed answers:** `ei`

**Normalization:** trim, lowercase, strip_final_punctuation

**Answer** (exactly as returned; finishReason stop):

~~~text
ei
~~~

**Score:** format 1 · correctness 1
- answer after normalization: `ei`

**Check:** OK

## 8. K2-004 (K2, difficulty 1)

Key: `pilot|K2-004|google|1`

**Instruction:** Eralda tekstist andmed ja tagasta AINULT JSON vastavalt skeemile. Ära lisa selgitusi ega koodiploki märgiseid. Kui mõnda välja tekstis ei ole, pane selle väärtuseks null. Tekstiväljad esita nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Koosolek toimub neljapäeval kell 10.30 ruumis ICO-316.
~~~

</details>

**Expected JSON** (expected_null: none):
~~~text
{
  "nädalapäev": "neljapäev",
  "kellaaeg": "10.30",
  "ruum": "ICO-316"
}
~~~

**Answer** (exactly as returned; finishReason STOP):

~~~text
{
  "nädalapäev": "neljapäev",
  "kellaaeg": "10.30",
  "ruum": "ICO-316"
}
~~~

**Score:** format 1 · correctness 1
- wrong fields: none
- nullViolations: 0

**Check:** OK

## 9. K3-004 (K3, difficulty 1)

Key: `pilot|K3-004|openai|1`

**Instruction:** Võta tekst kokku täpselt ühe lausega.

<details><summary>Source text</summary>

~~~text
Uus raamatukogu avati Tartus möödunud reedel. Hoone maksumus oli 8,5 miljonit eurot ja ehitus kestis kaks aastat. Avapäeval külastas hoonet üle kolme tuhande inimese.
~~~

</details>


**Answer** (exactly as returned; finishReason stop):

~~~text
Tartus avati möödunud reedel 8,5 miljonit eurot maksnud ja kaks aastat ehitatud raamatukogu, mida külastas avapäeval üle kolme tuhande inimese.
~~~

**Score:** format 1 · correctness 1

| rule | value | counts for | passed |
|---|---|---|---|
| sentence_count | `1` | format | yes |
| language | `"et"` | correctness | yes |

**Check:** OK

## 10. K1-039 (K1, difficulty 5)

Key: `pilot|K1-039|openai|1`

**Instruction:** Mitu inimest on praegu puhkusel? Vasta ainult arvuga.

<details><summary>Source text</summary>

~~~text
Meeskonnas on Anu, Peeter, Kadi ja Rain. Puhkusel on kõik peale Kadi. Rain naaseb puhkuselt homme.
~~~

</details>

**Allowed answers:** `3`

**Normalization:** trim, strip_final_punctuation, strip_preamble

**Answer** (exactly as returned; finishReason stop):

~~~text
3
~~~

**Score:** format 1 · correctness 1
- answer after normalization: `3`

**Check:** OK

## 11. K2-024 (K2, difficulty 3)

Key: `pilot|K2-024|google|1`

**Instruction:** Eralda tekstist andmed ja tagasta AINULT JSON vastavalt skeemile. Ära lisa selgitusi ega koodiploki märgiseid. Kui mõnda välja tekstis ei ole, pane selle väärtuseks null. Tekstiväljad esita nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Kliendi nimi: Rein Tamm. Telefon: -. E-post: rein@naidis.ee
~~~

</details>

**Expected JSON** (expected_null: telefon):
~~~text
{
  "nimi": "Rein Tamm",
  "epost": "rein@naidis.ee",
  "telefon": null
}
~~~

**Answer** (exactly as returned; finishReason STOP):

~~~text
{"nimi": "Rein Tamm", "telefon": null, "epost": "rein@naidis.ee"}
~~~

**Score:** format 1 · correctness 1
- wrong fields: none
- nullViolations: 0

**Check:** OK

## 12. K3-015 (K3, difficulty 3)

Key: `pilot|K3-015|google|1`

**Instruction:** Esita teksti sisu täpselt kahe täpploendi reana, kumbki kuni 12 sõna.

<details><summary>Source text</summary>

~~~text
Tarkvara versioon 4.2 parandas 17 viga ja lisas kaks uut funktsiooni. Uuendus on tasuta kõigile olemasolevatele klientidele. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

</details>


**Answer** (exactly as returned; finishReason STOP):

~~~text
* Tasuta uuendus 4.2 parandas 17 viga ja lisas kaks uut funktsiooni.
* Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

**Score:** format 1 · correctness 1

| rule | value | counts for | passed |
|---|---|---|---|
| max_line_breaks | `3` | format | yes |
| regex_present | `^[-*•] (flags: -)` | correctness | yes |
| language | `"et"` | correctness | yes |

**Check:** OK

## 13. K1-033 (K1, difficulty 5)

Key: `pilot|K1-033|openai|1`

**Instruction:** Kui suur on kuutasu eurodes? Vasta ainult arvuga.

<details><summary>Source text</summary>

~~~text
Litsents maksab 40 eurot kuus kasutaja kohta. Kümnest kasutajast alates kehtib 15% soodustus kogu summalt. Ettevõttes on 12 kasutajat.
~~~

</details>

**Allowed answers:** `408`

**Normalization:** trim, strip_final_punctuation, strip_preamble, decimal_point

**Answer** (exactly as returned; finishReason stop):

~~~text
408
~~~

**Score:** format 1 · correctness 1
- answer after normalization: `408`

**Check:** OK

## 14. K2-040 (K2, difficulty 5)

Key: `pilot|K2-040|openai|1`

**Instruction:** Eralda tekstist andmed ja tagasta AINULT JSON vastavalt skeemile. Ära lisa selgitusi ega koodiploki märgiseid. Kui mõnda välja tekstis ei ole, pane selle väärtuseks null. Tekstiväljad esita nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Kohtumised: Kaiale 3. märtsil, Reinule 17. märtsil ja Maarjale 2. aprillil 2026.
~~~

</details>

**Expected JSON** (expected_null: none):
~~~text
{
  "kohtumised": [
    {
      "isik": "Kaia",
      "kuupäev": "2026-03-03"
    },
    {
      "isik": "Rein",
      "kuupäev": "2026-03-17"
    },
    {
      "isik": "Maarja",
      "kuupäev": "2026-04-02"
    }
  ]
}
~~~

**Answer** (exactly as returned; finishReason stop):

~~~text
{"kohtumised":[{"isik":"Kaia","kuupäev":"2026-03-03"},{"isik":"Rein","kuupäev":"2026-03-17"},{"isik":"Maarja","kuupäev":"2026-04-02"}]}
~~~

**Score:** format 1 · correctness 1
- wrong fields: none
- nullViolations: 0

**Check:** OK

## 15. K3-038 (K3, difficulty 5)

Key: `pilot|K3-038|anthropic|1`

**Instruction:** Sõnasta märkmed korrektses eesti keeles, ilma ingliskeelsete sõnadeta. Kuni 25 sõna.

<details><summary>Source text</summary>

~~~text
Meeting notes: tiim otsustas migrate the database järgmisel sprindil. Deadline on 12. mai.
~~~

</details>


**Answer** (exactly as returned; finishReason end_turn):

~~~text
Koosoleku märkmed: meeskond otsustas andmebaasi üle viia järgmises sprindis. Tähtaeg on 12. mai.
~~~

**Score:** format 1 · correctness 1

| rule | value | counts for | passed |
|---|---|---|---|
| max_words | `25` | format | yes |
| language | `"et"` | correctness | yes |
| regex_absent | `(meeting\|migrate\|database\|deadline\|sprint) (flags: i)` | correctness | yes |
| contains | `["12"]` | correctness | yes |

**Check:** OK

## 16. K1-036 (K1, difficulty 5)

Key: `pilot|K1-036|google|1`

**Instruction:** Klassifitseeri tagasiside. Vasta täpselt ühega: POSITIIVNE / NEGATIIVNE / NEUTRAALNE

<details><summary>Source text</summary>

~~~text
Ei saa öelda, et oleksin ostuga pettunud – pigem vastupidi.
~~~

</details>

**Allowed answers:** `positiivne`

**Normalization:** trim, lowercase, strip_final_punctuation

**Answer** (exactly as returned; finishReason STOP):

~~~text
POSITIIVNE
~~~

**Score:** format 1 · correctness 1
- answer after normalization: `positiivne`

**Check:** OK

## 17. K2-014 (K2, difficulty 3)

Key: `pilot|K2-014|deepseek|1`

**Instruction:** Eralda tekstist andmed ja tagasta AINULT JSON vastavalt skeemile. Ära lisa selgitusi ega koodiploki märgiseid. Kui mõnda välja tekstis ei ole, pane selle väärtuseks null. Tekstiväljad esita nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Helista numbril 5123 4567 või rahvusvaheliselt +372 5123 4567.
~~~

</details>

**Expected JSON** (expected_null: none):
~~~text
{
  "telefon_e164": "+37251234567"
}
~~~

**Answer** (exactly as returned; finishReason stop):

~~~text
{"telefon_e164":"+37251234567"}
~~~

**Score:** format 1 · correctness 1
- wrong fields: none
- nullViolations: 0

**Check:** OK

## 18. K3-021 (K3, difficulty 3)

Key: `pilot|K3-021|anthropic|1`

**Instruction:** Selgita uuenduse sisu kliendile, kes ei ole tehniline. Kuni 40 sõna, ilma ingliskeelsete terminiteta.

<details><summary>Source text</summary>

~~~text
Tarkvara versioon 4.2 parandas 17 viga ja lisas kaks uut funktsiooni. Uuendus on tasuta kõigile olemasolevatele klientidele. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

</details>


**Answer** (exactly as returned; finishReason end_turn):

~~~text
Tarkvara uus versioon 4.2 parandab 17 viga ja toob kaks uut võimalust. Uuendus on kõigile praegustele klientidele tasuta. Pidage meeles: vanemate versioonide tugi lõpeb 1. juunil 2026, seega soovitame uuendada varakult.
~~~

**Score:** format 1 · correctness 1

| rule | value | counts for | passed |
|---|---|---|---|
| max_words | `40` | format | yes |
| language | `"et"` | correctness | yes |
| regex_absent | `(release\|update\|bugfix\|feature) (flags: i)` | correctness | yes |

**Check:** OK

## 19. K1-032 (K1, difficulty 5)

Key: `pilot|K1-032|xai|1`

**Instruction:** Kes palus aruannet? Vasta ühe sõnaga nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Martale kirjutas Marti, kes palus aruannet. Marta vastas talle järgmisel päeval.
~~~

</details>

**Allowed answers:** `marti`

**Normalization:** trim, lowercase, strip_final_punctuation, strip_preamble

**Answer** (exactly as returned; finishReason stop):

~~~text
Marti
~~~

**Score:** format 1 · correctness 1
- answer after normalization: `marti`

**Check:** OK

## 20. K2-002 (K2, difficulty 1)

Key: `pilot|K2-002|xai|1`

**Instruction:** Eralda tekstist andmed ja tagasta AINULT JSON vastavalt skeemile. Ära lisa selgitusi ega koodiploki märgiseid. Kui mõnda välja tekstis ei ole, pane selle väärtuseks null. Tekstiväljad esita nimetavas käändes.

<details><summary>Source text</summary>

~~~text
Palun lisage kasutaja: Kadri Ilves, e-post kadri.ilves@naidis.ee, telefon 5123 4567.
~~~

</details>

**Expected JSON** (expected_null: none):
~~~text
{
  "nimi": "Kadri Ilves",
  "epost": "kadri.ilves@naidis.ee",
  "telefon": "5123 4567"
}
~~~

**Answer** (exactly as returned; finishReason stop):

~~~text
{"nimi": "Kadri Ilves", "epost": "kadri.ilves@naidis.ee", "telefon": "5123 4567"}
~~~

**Score:** format 1 · correctness 1
- wrong fields: none
- nullViolations: 0

**Check:** OK
