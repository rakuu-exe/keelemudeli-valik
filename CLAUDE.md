# CLAUDE.md

See repositoorium on diplomitöö **„Keelemudeli valiku mitmekriteeriumiline metoodika tarkvaraarenduses“** (TalTech IT Kolledž, IADB, juhendaja Toomas Lepikult) tarkvaraline osa.

Aluseks on allkirjastatud lõputöö kavand ja autori otsused failis `kavandi_tooplaan.xlsx`. **Ehita ainult seda, mis on kirjas failis `PLAN.md`.** Ära lisa komponente, analüüse ega statistilisi meetodeid, mida seal pole. Kui midagi tundub puudu olevat või otsus on ebaselge, küsi autorilt.

Lõputöö tekst ei kuulu selle repositooriumi ulatusse. Selle kirjutab autor ise.

---

## Mida ehitatakse

- **Mõõtmiskonveier:** konfiguratsioonipõhine prototüüp, mis saadab samad ülesanded viie pakkuja mudelitele API kaudu. Uue mudeli saab lisada koodi muutmata.
- **Testkogum:** 120 eestikeelset ülesannet kolmes kategoorias ja kolmel raskusastmel (`data/ulesandepank_v1_3.json`).
- **Automaatne hindamine:** reeglid (112 ülesannet) ja LLM-kohtunik (8 truuduse ülesannet).
- **Viis kriteeriumi:** korrektsus, vormingukuulekus, hind, latentsus, stabiilsus; 5 kordust.
- **Otsustusmudel:** min-max normaliseerimine ja kaalutud summa mudel (WSM), kaks kasutusprofiili, aastane kulu.
- **Tundlikkusanalüüs** ja **võrdlus ülesandekategooriate lõikes.**
- **Valideerimine:** arvutuste õigsus, korratavus (sh kuues mudel ilma koodimuutuseta), hinnaarvutuse kontroll, inimhindamine kahe hindajaga (lineaarne kaalutud Coheni kappa).

## Põhimõtted

1. **Mõõda üks kord, arvuta mitu korda.** API-kutsed tehakse ainult mõõtmisel. Hindamine, kulu ja analüüs töötavad salvestatud andmete peal.
2. **Toorandmeid ei muudeta.** `results/raw/*.jsonl` ja `results/judge/hinded.jsonl` failidesse ainult lisatakse ridu.
3. **Toorvastust ei puhastata.** Vastus salvestatakse täpselt sellisena, nagu API selle tagastas.
4. **Sama ülesandetekst kõigile.** Iga päring on üks kasutajasõnum ülesandepanga mallist. Süsteemijuhist ei kasutata.
5. **Pakkuja vaikeseadistus.** Temperatuuri, mõtlemisrežiimi, effort-taset ega muid genereerimisparameetreid testitavatele mudelitele ei saadeta. Ainus parameeter on maksimaalne väljundpikkus 16 000. Lubatud on mittegenereerivad valikud, mida mõõtmine vajab (nt tokenite arv striimis).
6. **Tööriistu ega struktureeritud väljundi režiime testitavatele mudelitele ei anta** (muidu ei saaks vormingukuulekust mõõta ja tekiks lisakulu).
7. **Päringud striimitakse**, et latentsus oleks kõigil pakkujatel ühtemoodi mõõdetud.
8. **API viga ei ole vale vastus.** Veaga päringud salvestatakse olekuga `error` ja jäetakse hindamisest välja. Keeldumine, tühi vastus ja katkenud vastus on aga tavalised vastused.
9. **Iga katse API-võtmega tehtud päring käib läbi konveieri ja logitakse**, ka proovipäringud. Muidu ei klapi hinnaarvutuse kontroll.
10. **Kulu arvutatakse tagantjärele** kahe summana: `kuluKriteerium` (ilma vahemäluta, WSM-i jaoks) ja `kuluArveldatud` (vahemäluga, kontrolli jaoks). USD.
11. **Mudeliversioon fikseeritakse, kus pakkuja seda võimaldab.** Vastuses tagastatud mudelinimi salvestatakse alati.

## LLM-kohtunik

- Ainult 8 ülesannet: K3-026, K3-027, K3-028, K3-031, K3-033, K3-035, K3-037, K3-039.
- Kohtunik on **Claude Opus 5.5 Claude Code'i kaudu autori Pro-tellimusega** (`claude -p`), mitte ükski testitav mudel.
- Kohtunik **ei näe kunagi mudeli nime**: ta saab anonüümse faili, kus on ainult lähtetekst, juhis, rubriik ja vastus. Võti on eraldi.
- Iga fail on **eraldi väljakutse**, 3 korda, mediaan. Ära kunagi hinda mitut vastust ühes sessioonis.
- Lapsprotsessi keskkonnast eemaldatakse `ANTHROPIC_API_KEY`, muidu arveldab Claude Code API kaudu ja segab Sonneti kulu.
- Täpsed lipud: `PLAN.md` faas 3b.

## Terminoloogia

Kasuta lõputööga samu termineid: **mõõtmiskonveier** (mitte „torustik“), **kasutusprofiil**, **kriteerium**, **koondhinne**, **kohtunik**, **pilootkatse**, **põhimõõtmine**.

## Tehnoloogia

- **Mõõtmiskonveier:** Node.js 24, ESM.
  - `openai` (OpenAI, xAI ja DeepSeek OpenAI-ühilduva API kaudu, erineva `baseURL`-iga)
  - `@anthropic-ai/sdk`
  - `@google/genai`
  - `ajv` (JSON-skeemid; kompileeritud skeemid puhverdatakse, et vältida „schema already exists“ viga)
  - `franc` (keeletuvastus; eesti keel = `ekk`)
  - `dotenv`
  - testid: `node:test`
- **Kohtunik:** Claude Code CLI (`claude -p`).
- **Analüüs:** Python 3.11+, `pandas`, `numpy`, `scikit-learn`, `matplotlib`.
- **Inimhindamise vorm:** Google Apps Script.

Enne iga pakkuja SDK ja Claude Code'i lippude kasutamist kontrolli nende praegust dokumentatsiooni.

## Kaustastruktuur

```
config/
  models.json        mudelid ja maksimaalne väljundpikkus
  pricing.json       hinnad (USD), hinnakirja kuupäev
  profiles.json      kasutusprofiilide kaalud, päevane maht 10 000
  run.pilot.json     pilootkatse (1 kordus)
  run.main.json      põhimõõtmine (5 kordust)
  run.luna.json      korratavuse test (kuues mudel, ~10 ülesannet)
data/
  ulesandepank_v1_3.json
  kategooria2_skeemid.json
  schemas/
prompts/
  kohtunik.txt       kohtuniku süsteemijuhis
src/
  adapters/          openaiCompatible.js, anthropic.js, google.js, fake.js
  runner/            konveier
  checkers/          reeglitega hindamine
  judge/             prepare.js, run.js
  cost/              kuluarvutus
test/
analysis/            Pythoni analüüs, run_all.py
tools/
  apps_script/       Google Formsi loomine valimist
results/
  raw/               toorread
  scored/            hinded
  judge/             input/, voti.csv, hinded.jsonl
  cost/              kulu
  human/             valim, võti, hindajate hinded
  figures/           tabelid ja joonised
```

## Andmeformaadid

### Toorrida (`results/raw/<runId>.jsonl`)

Üks rida = üks API-päring.

```json
{
  "key": "<runId>|<taskId>|<modelId>|<kordus>",
  "runId": "2026-11-20-main",
  "taskId": "K2-026",
  "modelId": "deepseek",
  "modelRequested": "deepseek-flash",
  "modelVersion": "<vastusest>",
  "kordus": 3,
  "tsStartUtc": "2026-11-20T14:03:11.482Z",
  "ttftMs": 412.7,
  "totalMs": 1893.4,
  "status": "ok",
  "error": null,
  "finishReason": "stop",
  "usage": { "input": 214, "cachedInput": 192, "output": 57, "reasoning": null },
  "text": "<mudeli täpne vastus>"
}
```

`cachedInput` ja `reasoning` on `null`, kui pakkuja neid ei tagasta. Käivitamisel loetakse olemasolevad võtmed ja need jäetakse vahele.

### Skoori rida (`results/scored/<runId>.jsonl`)

`key`, `taskId`, `modelId`, `kordus`, `kategooria`, `hindamisviis` (`reeglid` või `kohtunik`), `vorming` (0/1), `korrektsus` (0…1).

### Kohtunik (`results/judge/`)

- `input/H####.json`: `{ "id", "lahtetekst", "juhis", "rubriik", "vastus" }`. Mudeli nime ega võtit ei ole.
- `voti.csv`: `id` → toorrea `key`. Kohtunik seda ei näe.
- `hinded.jsonl`: `{ "id", "kordus" (1–3), "skoor" (0/1/2 või null), "pohjendus", "mudel", "claudeCodeVersioon", "ts" }`.

### Kulu rida (`results/cost/<runId>.jsonl`)

`key`, `kuluKriteerium`, `kuluArveldatud` (USD).

### Inimhindamine (`results/human/`)

- `valim.csv`: `vastuseId`, lähtetekst, ülesanne, vastus. Mudeli nime ei ole.
- `voti.csv`: `vastuseId` → `key`, hindamisviis. Seda faili hindajatele ei anta.
- `hinded_hindaja1.csv`, `hinded_hindaja2.csv`: `vastuseId`, `hinne` (0, 1 või 2), `kommentaar`.

## Mudelid

| id | pakkuja | mudel | adapter |
|---|---|---|---|
| openai | OpenAI | `gpt-6.1-terra` | openaiCompatible |
| anthropic | Anthropic | `claude-sonnet-5-5` | anthropic |
| google | Google | `gemini-3.8-flash` | google |
| deepseek | DeepSeek | `deepseek-flash` | openaiCompatible |
| xai | xAI | `grok-4.7` | openaiCompatible |
| luna (ainult korratavuse test) | OpenAI | `gpt-6-luna` | openaiCompatible |

API-võtmed on ainult failis `.env`, mida ei commit'ita.

## Mida mitte teha

- Ära tee testides päris API-kutseid ega kohtunikukutseid. Kasuta `fake`-adapterit ja võltskohtunikku.
- Ära muuda ega kustuta toorandmete ridu.
- Ära saada testitavatele mudelitele süsteemijuhist, genereerimisparameetreid ega tööriistu.
- Ära kasuta kohtunikku muude kui 8 nimetatud ülesande jaoks ja ära näita kohtunikule mudeli nime.
- Ära tee katse API-võtmetega päringuid konveierist mööda.
- Ära muuda pärast git tag'i `main-run` testkogumit, malli ega seadistust.
- Ära tee ise otsuseid, mida `PLAN.md` ega `kavandi_tooplaan.xlsx` ei kata. Küsi autorilt.
