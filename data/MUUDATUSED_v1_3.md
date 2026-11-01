# Ülesandepank v1.2 → v1.3: muudatuste logi

**Kuupäev:** 1.11.2026
**Failid:** `ulesandepank_v1_2.json` (algne, muutmata) → `ulesandepank_v1_3.json`
**Kontroll:** `npm run kontroll` (kõik testid läbivad)

Ülesannete arv, kategooriad ja raskusastmed ei muutunud: 120 ülesannet, igas kategoorias 40 (raskusastmed 10/15/15). Kohtuniku-ülesandeid on endiselt 8. Kategooria 2 JSON-skeeme (`schemas/`, `kategooria2_skeemid.json`) ei muudetud.

Täpne erinevus: `git diff --no-index data/ulesandepank_v1_2.json data/ulesandepank_v1_3.json`

Sulgudes olevad tähised (nt [L2]) viitavad failis `kavandi_tooplaan.xlsx` olevatele otsustele.

---

## 1. Autori otsustatud muudatused

### 1.1 Süsteemijuhis eemaldati [L2, L3]

- **Mida:** `mõõtmisjuhis.süsteemijuhis` („Oled abiline, kes täidab ülesandeid täpselt…“) ja märkus mõtlemisrežiimi fikseerimise kohta eemaldati. Asemele tulid väljad `päring` ja `seadistus`.
- **Miks:** iga päring on üks kasutajasõnum ja kõigile mudelitele kasutatakse pakkuja vaikeseadistust, nagu kavandi lähtetingimustes on kirjas. Kõik ülesannete juhised ütlevad ise vastuse vormi, nii et süsteemijuhist pole vaja. Mõtlemisrežiimi ei fikseerita: ainus saadetav parameeter on maksimaalne väljundpikkus 16 000 tokenit.

### 1.2 Lisati kasutajasõnumi mall [L2]

- **Mida:** uus plokk `kasutajasõnumi_mall`:
  - K1 ja K3: `Tekst:\n{sisend}\n\n{juhis}`
  - K2: `Tekst:\n{sisend}\n\nSkeem:\n{skeem}\n\n{juhis}`
- **Miks:** v1.2 ei määranud, kuidas ülesande osad üheks sõnumiks pannakse. Mall seda teeb, aga ülesandeid endid ei muuda.
- **Täpsustus:** `{skeem}` on ülesande välja `skeem` väärtus JSON-ina 2-tühikulise taandega.

### 1.3 Keelekood `est` → `ekk` [L4]

- **Mida:** `keele_kontroll.pikk_väljund` ütleb nüüd, et eesti keele kood on `ekk`. Lisati väli `franc_koodid` (`et` → `ekk`, `en` → `eng`).
- **Miks:** franc kasutab ISO 639-3 koode ja tagastab eesti keele kohta `ekk` (standardeesti keel), mitte makrokeele koodi `est`. Koodiga `est` ei oleks ükski vastus keelekontrolli läbinud.

### 1.4 Regexid: Pythoni `(?i)` asendati lipuga [L4]

- **Mida:** 9 regexit algasid Pythoni süntaksiga `(?i)`. See eemaldati ja tõstutundetus on nüüd väljal `"lipud": "i"`. Muudetud ülesanded: K3-014, K3-019, K3-021, K3-024, K3-038, K3-040 (2 regexit), K3-030 ja K3-032. Viimased kaks said lisaks sõnapiirid (punkt 1.5).
- **Miks:** JavaScript ei toeta kogu mustrile kehtivat `(?i)`-lippu ja `new RegExp('(?i)…')` annab vea.
- **Lisaks:** `kontrollitüübid.reeglid` kirjeldab nüüd välju `lipud` ja `terve_sona`.

### 1.5 Sõnapiirid ülesannetes K3-032 ja K3-030 [L4]

- **Mida:** reeglile lisati `"terve_sona": true` ja `"lipud": "iu"`. Muster ümbritsetakse kujul `(?<![\p{L}\p{N}])(?:muster)(?![\p{L}\p{N}])`.
- **Miks:** v1.2 mustrid otsisid alamstringe ja andsid vale-positiivseid: „kolm“ sobis sõnaga „kolmapäeval“, „üks“ sõnaga „ükski“, „juht“ sõnaga „juhtisid“. JavaScripti `\b` siin ei sobi, sest see ei loe täpitähti tähtedeks: `/\büks\b/i.test("üks")` annab `false`. Unicode-tähtede klass `\p{L}` vajab lippu `u`.

### 1.6 K3-032: lähtetekst ja keelatud arvsõnad [L4]

- **Lähtetekst:**
  - „Ettevõte **viis läbi** kliendiküsitluse“ → „Ettevõte **korraldas** kliendiküsitluse“
  - „Küsitlus **viidi läbi** e-posti teel märtsis.“ → „Küsitlus **toimus** e-posti teel märtsis.“
- **Miks:** ülesanne keelab arvsõnad, sh „viis“. Lähtetekstis oli „viis“ tegusõnana („viis läbi“), nii et lähteteksti sõnastust kasutav korrektne vastus kukkus reeglis läbi. Sõnapiir seda ei lahenda, sest tegusõna on terve sõna.
- **Uus muster:** lisaks põhivormidele püütakse kinni ka käänatud arvsõnad: ühe, kahe, kolme, viie, üheksast, kolmandik… jne. Erand on `viis(?!\s+läbi)`: tegusõna „viis läbi“ ei loeta arvsõnaks.
- **Teised ülesanded:** sama lähteteksti kasutavates ülesannetes K3-005, K3-008, K3-019 ja K3-026 lähteteksti ei muudetud. Nende reeglid arvsõnu ei keela.

### 1.7 K3-030: ametinimetuste muster [L4]

- **Mida:** `(juht|tegevjuht|direktor|CEO)` asendati terve sõna mustriga, mis püüab kinni ka käänatud vormid: tegevjuh…, peadirektor…, direktor…, juhataja…, esimees/esimeh…, CEO ja CEO-d, juht, juhi, juhti, juhid, juhte, juhtide, juhil, juhile, juhilt, juhiga, juhina.
- **Miks:**
  - v1.2 alamstring „juht“ andis vale-positiivse tegusõnale („Kasvu **juht**isid tellimusteenused“), mis on lähteteksti „driven by“ loomulik tõlge.
  - Samas jäi märkamata loomulik omastava käände vorm „**Tegevjuhi** sõnul…“.

### 1.8 Kohtuniku juhis [L4, M2]

- **Mida:** `kohtuniku_juhis` sai uued väljad:
  - `kohtunik`: Claude Opus 5.5 Claude Code'i kaudu, effort medium;
  - `ülesanded`: 8 ülesande loend;
  - `sisend`: kohtunik saab ainult lähteteksti, juhise, rubriigi ja vastuse ega näe mudeli nime;
  - `korrektsus`: mediaan 0/1/2 teisendatakse korrektsuseks 0 / 0,5 / 1.
- **Muutmata:** skaala 0/1/2, 3 hinnangut ja mediaan olid v1.2-s juba olemas.
- **Lisaks:** `kontrollitüübid.kohtunik` lause „Need ülesanded moodustavad inimhindajate valimi“ asendati lausega „Kohtuniku hinnatud vastused on osa inimhindamise valimist“. Inimhindamise valim on otsuse [M14] järgi 60 vastust kõigist kategooriatest.

---

## 2. Ettepanek, mis ootab autori kinnitust

### 2.1 franc valib ainult eesti ja inglise keele vahel

- **Mida:** `keele_kontroll.franc_kandidaadid = ["ekk", "eng"]`. Vähemalt 8-sõnalise väljundi keel määratakse kahe keele vahel, mitte kõigi franc'i 187 keele seast.
- **Miks:** vaikeseadistuses tuvastas franc 40 erinevast korrektsest tekstist (vähemalt 8-sõnalised K3 näidisvastused ja kaks ingliskeelset testlauset) 2 valesti:

  | Tekst | Õige | franc vaikimisi |
  |---|---|---|
  | „Teises kvartalis kasvas müük 8 protsenti ning samal perioodil käivitati ka uus reklaamikampaania.“ (K3-028 näidisvastus) | ekk | pam (pampanga) |
  | „The study found no statistically significant link between coffee and sleep.“ | eng | sco (šoti) |

  Kahe keele vahel valides oli vigu 0. Keelekontroll peab eristama just neid kahte keelt, sest testkogumi tüüpiline viga on see, et mudel vastab sisendi keeles (inglise) eesti keele asemel või vastupidi (K3-011, K3-017, K3-030, K3-038).
- **Kui ettepanekut ei kinnitata:** eemalda väli `franc_kandidaadid`. Kontrollskript näitab siis K3-028 näidisvastuse kukkumist.

---

## 3. Leitud, aga muutmata (autori otsustada)

- **K3-005:** muster `(9|üheksa)` on tõstutundlik. Õige vastus, mis algab suure tähega („Üheksast kliendist…“), kukub reeglis läbi. Võimalik parandus on `"lipud": "i"`.
- **K3-026 märkus:** märkus väidab, et osa juhtumeid püüab kinni reegel `regex_puudub '(?i)(enamik|suurem osa|paljud)'`. Sellist reeglit ülesandes pole: kohtuniku-ülesande lisareegel on ainult `keel`. Märkus ei mõjuta hindamist.
- **Vorming:** K2 ülesannetel on kaks sama väärtusega välja, `json_schema_fail` ja `json_schema`. Need jäeti alles.

---

## 4. Kontrollskript

`test/ulesandepank.test.js` (`npm run kontroll`) kontrollib järgmist:

- **Struktuur:** 120 ülesannet, 40 igas kategoorias, raskusastmed 10/15/15, unikaalsed ID-d, kohtuniku 8 ülesannet.
- **v1.3 muudatused:** süsteemijuhist pole, `ekk`, ühtegi `(?i)` pole, kõik 16 regexit kompileeruvad Node'is.
- **Sõnapiiride testjuhtumid (K3-032, K3-030):** iga muster leiab kõik need vormid, mida peab leidma, ja ei leia ühtegi neist, mida ei tohi leida.
- **Kasutajasõnumi mall:** sõnum koostub kõigi 120 ülesande jaoks ja kohatäiteid ei jää.
- **K1:** iga lubatud vastus jääb normaliseerimise järel lubatuks, ka kujul „Vastus: X.“ suure algustähega.
- **K2:** etalon läbib JSON-skeemi; etaloni, ülesande skeemi ja JSON-skeemi väljad on samad. Puuduv väli, lisaväli, vale kuupäevavorm ja lubamatu enum-väärtus kukuvad läbi (v1.2 skripti `kontrolli_skeeme.mjs` kontrollid).
- **K3:** igal ülesandel on näidisvastus (`test/fixtures/k3_naidisvastused.json`), mis läbib ülesande reeglid. Kohtuniku-ülesannetel läbib see ainult lisareeglid.
  - Näidisvastused on ainult kontrolli jaoks. Mudelitele neid ei saadeta ja hindamises ei kasutata.
  - Kontroll näitab, et iga reeglikomplekt on õige vastusega täidetav. Just see kontroll oleks K3-032 vea varem leidnud.
