# PLAN.md

Tööplaan lõputöö tarkvaralise osa ehitamiseks. Aluseks on allkirjastatud kavand ja autori otsused failis `kavandi_tooplaan.xlsx` (sulgudes olevad tähised, nt [M2], viitavad selle faili ridadele). Tee üks faas korraga. Iga faasi lõpus vaatab autor tulemuse üle ja alles siis minnakse edasi.

**Tähtajad:** töö eelkaitsmiseks 30.11, eelkaitsmine 7.–11.12, lõppversioon 5.01.

---

## Enne alustamist (autor)

- [ ] Viis API-kontot, igal pakkujal eraldi võti või projekt ainult selle katse jaoks; igale kontole kululimiit, kokku kuni 50 € [L5, PK9].
- [ ] Claude Code'is `/model`: kontrolli, et Claude Opus 5.5 on Pro-plaanis saadaval [M2].
- [ ] Küsi Lepikultilt: stabiilsuse mõõdik [M6] ja kas sissejuhatusse tulevad uurimisküsimused [S1].
- [ ] Lepi kahe kursakaaslasega kokku inimhindamise aeg (~24.–27.11) [M14].

## Kinnitatud valikud (lühidalt)

| Teema | Otsus |
|---|---|
| Mudelid [L1] | `gpt-6.1-terra`, `claude-sonnet-5-5`, `gemini-3.8-flash`, `deepseek-flash`, `grok-4.7` |
| Päring [L2, L3] | üks kasutajasõnum mallist, süsteemijuhist pole, ainus parameeter max väljund 16 000, tööriistu pole |
| Kordused [M7] | 5; mõõtmine ringidena (kordus 1 kõigile, siis kordus 2 jne) |
| Pilootkatse [L5] | 5 × 120 × 1 = 600 päringut |
| Põhimõõtmine [PK4] | 5 × 120 × 5 = 3000 päringut |
| Kohtunik [L4, M2] | Claude Opus 5.5 Claude Code'i kaudu (Pro-tellimus), effort medium, ainult 8 ülesannet, 3 hinnangut, mediaan |
| Profiilid [E3] | A: korrektsus 0,40, vorming 0,25, stabiilsus 0,15, hind 0,10, latentsus 0,10. B: korrektsus 0,25, vorming 0,10, stabiilsus 0,10, hind 0,40, latentsus 0,15 |
| Kulu [M4] | USD; kaks summat: kriteeriumi kulu (ilma vahemäluta) ja arveldatud kulu (vahemäluga) |
| Kasutatavuse kriteerium [E2] | 4 tingimust (vt faas 8) |

---

## Faas 0 – Seadistus ja ülesandepank v1.3

- [ ] Node 22 projekt (`"type": "module"`), `.gitignore` (sh `.env`), `.env.example` viie võtmega.
- [ ] Kopeeri `ulesandepank_v1_2.json`, `kategooria2_skeemid.json` ja `schemas/` kausta `data/`.
- [ ] Koosta `ulesandepank_v1_3.json` [L2, L4]:
  - eemalda `mõõtmisjuhis.süsteemijuhis` ja märkus mõtlemisrežiimi fikseerimise kohta (kasutatakse pakkuja vaikeseadistust);
  - lisa kasutajasõnumi mall: K1 ja K3 `Tekst:\n{sisend}\n\n{juhis}`, K2 `Tekst:\n{sisend}\n\nSkeem:\n{skeem}\n\n{juhis}`;
  - `keele_kontroll`: franc tagastab eesti keele kohta `ekk`, mitte `est`;
  - 9 regexit, mis algavad Pythoni `(?i)`-ga: eemalda `(?i)` ja kasuta JS `i`-lippu (Node ei toeta `(?i)`);
  - K3-032 („viis“, „kolm“) ja K3-030 („juht“): lisa sõnapiirid, et alamstringid ei annaks vale-positiivset;
  - **kohtuniku 8 ülesannet jäävad** (K3-026, -027, -028, -031, -033, -035, -037, -039); `kohtuniku_juhis` uuendada: kohtunik on Claude Opus 5.5, hinnang 0/1/2, 3 korda, mediaan.
- [ ] Kontrollskript: 120 ülesannet, 40 igas kategoorias, raskusastmed 10/15/15 kategooria kohta, iga etalon läbib oma kontrolli (kohtuniku-ülesannetel ainult `lisareeglid`), kõik regexid kompileeruvad Node'is.

**Valmis, kui:** kontrollskript läbib.

## Faas 1 – Adapterid

- [ ] Ühine liides: sisend mudel ja kasutajasõnum; väljund `text`, `modelVersion`, `usage` (sisend, väljund, vahemälust loetud sisend, mõtlemistokenid kui pakkuja need eraldi tagastab), `ttftMs`, `totalMs`, `finishReason`.
- [ ] Saadetakse ainult mudel, kasutajasõnum ja maksimaalne väljundpikkus 16 000. Lubatud on mittegenereerivad valikud, mida mõõtmine vajab (nt OpenAI-ühilduvatel `stream_options.include_usage`, et striimis tuleksid tokenid).
- [ ] Adapterid: `openaiCompatible` (OpenAI, xAI, DeepSeek), `anthropic`, `google`, `fake`. Enne iga adapteri kirjutamist kontrolli pakkuja praegust dokumentatsiooni (parameetri nimi max väljundi jaoks, vahemälu- ja mõtlemistokenite väljad).
- [ ] Striimimine; aeg `performance.now()`.
- [ ] Proovipäring igale mudelile **läbi konveieri** (logitakse nagu kõik teised päringud) [PK9]. Kui mõni mudel ei striimi või ei vasta, peatu ja küsi autorilt.

**Valmis, kui:** testid läbivad ja kõik viis mudelit vastavad proovipäringule.

## Faas 2 – Mõõtmiskonveier

- [ ] Ringid: välimine tsükkel on kordus, sisemine ülesanded × mudelid [M7].
- [ ] Iga päring salvestatakse toorreana (vt CLAUDE.md); fail ainult kasvab.
- [ ] Katkenud jooksu saab jätkata: juba salvestatud võtmeid ei korrata.
- [ ] Vead [PK1]: 429, 5xx ja ajalõpp → kuni 3 uut katset kasvava ootega; püsiv viga → veareana (`status: "error"`). Mudeli keeldumine, tühi vastus või pikkuse tõttu katkenud vastus on tavaline vastus.
- [ ] Käivitus: `node src/runner/run.js --config config/run.pilot.json`; lipud `--dry-run` (fake-adapter) ja `--limit N`.
- [ ] Seadistused: `run.pilot.json`, `run.main.json`, `run.luna.json`.

**Valmis, kui:** `--dry-run` annab õige arvu ridu ja katkestatud jooks jätkub duplikaatideta.

## Faas 3 – Automaatne hindamine (reeglid)

Iga vastus saab **vorming** (0/1) ja **korrektsus** (0…1). Veaga toorread jäetakse vahele.

- [ ] **K1:** vorming = vastus on (tühikuid eemaldades, tõstutundetult) üks lubatud vastustest; korrektsus = ülesandepanga normaliseerimise järel vastab etalonile.
- [ ] **K2** [M2a, M2b]:
  - vorming = vastus parsib JSON-iks **ilma muutmata** ja vastab skeemile (koodiploki märgid ``` → vorming 0);
  - korrektsus arvutatakse pärast koodiploki märkide eemaldamist; kui JSON ei parsi ka siis → 0;
  - võrdlus: tekstiväljad tühikuid normaliseerides ja tõstutundetult; arvud arvuna; `null` peab olema `null`; loend õige, kui elemendid on samad (järjekord ei loe);
  - korrektsus = õigete tipptaseme väljade osakaal.
- [ ] **K3 (32 reeglitega ülesannet):** vorming = pikkuse- ja struktuurireeglid; korrektsus = sisureeglite (nõutud faktid, keel, keelatud sisu) läbitud osakaal.
- [ ] **K3 (8 kohtuniku-ülesannet):** vorming = `lisareeglid`; korrektsus tuleb faasist 3b.
- [ ] Sõnade ja lausete loendamine ülesandepanga definitsioonide järgi.
- [ ] Testid: iga etalon saab maksimumhinde.

**Valmis, kui:** testid läbivad ja autor on 20 juhuslikku hinnet käsitsi üle kontrollinud.

## Faas 3b – LLM-kohtunik [L4, M2c, M2d]

- [ ] `src/judge/prepare.js`: iga kohtuniku-ülesande vastus → anonüümne fail `results/judge/input/H####.json`, mis sisaldab **ainult** lähteteksti, juhist, rubriiki ja vastust. ID-d juhuslikud, järjekord segatud (fikseeritud seemnega). Võti `results/judge/voti.csv` (H#### → toorrea `key`) eraldi.
- [ ] `src/judge/run.js`: iga fail hinnatakse **3 eraldi** väljakutsega:
  ```
  claude -p --safe-mode --system-prompt-file prompts/kohtunik.txt --tools "" \
    --model claude-opus-5-5 --effort medium \
    --output-format json --json-schema <skeem: skoor 0|1|2, põhjendus> \
    --no-session-persistence
  ```
  - lapsprotsessi keskkonnast **eemaldatakse `ANTHROPIC_API_KEY`** (muidu arveldab Claude Code API kaudu);
  - käivitatakse tühjas ajutises kaustas;
  - iga hinnang salvestatakse `results/judge/hinded.jsonl` (ID, kordus 1–3, skoor, põhjendus, mudel vastusest, `claude --version`);
  - kehtetu vastus (pole JSON või skoor pole 0/1/2) → uus katse; 3 kehtetut järjest → hinne puudub, raporteeritakse;
  - kasutuslimiidi korral oodatakse ja jätkatakse; katkenud jooksu saab jätkata.
- [ ] Mediaan kolmest; korrektsus 0 → 0, 1 → 0,5, 2 → 1; ühendatakse võtme kaudu skoori ridadega.

**Valmis, kui:** `--dry-run` (võltskohtunik) töötab ja ühe päris faili hinnang on salvestatud.

## Faas 4 – Kulu [M4]

- [ ] `config/pricing.json`: iga mudeli sisend-, vahemälu- ja väljundhind 1M tokeni kohta (USD) ning hinnakirja kuupäev. DeepSeekil tipptunni ja muu aja hinnad (tipptunnid E–R 01–04 ja 06–10 UTC). Hinnad 1.11.2026: Terra 1/5 (vahemälu 0,05); Sonnet 5.5 2/10; Gemini 3.8 Flash 0,75/3,75; DeepSeek flash tipp 0,30/1,20 (vahemälu 0,006), muu aeg pool sellest; grok-4.7 2/6. Ülejäänud vahemäluhinnad hinnakirjast; kontrolli kõik hinnad mõõtmise päeval üle.
- [ ] Iga toorrea kohta kaks summat:
  - `kuluKriteerium`: kogu sisend täishinnaga (nagu iga päring oleks uus) + väljund (mõtlemistokenid väljundina) → kasutatakse WSM-is;
  - `kuluArveldatud`: vahemälust loetud sisend vahemäluhinnaga → kasutatakse hinnaarvutuse kontrollis.
- [ ] DeepSeeki hind valitakse `tsStartUtc` järgi.

**Valmis, kui:** testid läbivad (sh tipptunni piir ja vahemälu).

## Faas 5 – Pilootkatse [L5, PK3]

- [ ] 5 mudelit × 120 ülesannet × 1 kord = 600 päringut; hindamine, kohtunik (40 vastust × 3 = 120 hinnangut), kulu.
- [ ] Lühiaruanne: vead ja katkenud vastused mudeli kaupa; tegelik kulu ja aeg ning põhimõõtmise hinnang; kahtlased ülesanded (nt kõik mudelid eksivad samamoodi, etalon tundub vale); kohtuniku kasutuslimiidi seis.
- [ ] Autor vaatab üle ~20 kohtuniku hinnet ja 20 reeglihinnet.
- [ ] Autor otsustab. Muuta tohib ainult vigaseid ülesandeid, vigast koodi ja vajadusel kohtuniku taset (medium → high).
- [ ] Külmutamine: git tag `main-run`. Pärast seda testkogumit, malli ega seadistust ei muudeta.

**Valmis, kui:** aruanne on olemas, autori otsused tehtud ja tag olemas. Pilootkatse andmeid põhivõrdluses ei kasutata.

## Faas 6 – Põhimõõtmine [PK4]

- [ ] 5 × 120 × 5 = 3000 päringut ringidena, võimalikult lühikese aja jooksul (1–2 päeva).
- [ ] Hindamine, kohtunik (200 vastust × 3 = 600 hinnangut) ja kulu kõigile ridadele.

**Valmis, kui:** kõik read on olemas ja hinnatud.

## Faas 7 – Analüüs

Kõik tabelid ja joonised ühe käsuga: `python analysis/run_all.py`.

- [ ] **Kriteeriumid mudeli kohta** (kokku ja kategooriate kaupa):
  - korrektsus: keskmine; vormingukuulekus: keskmine [M3];
  - hind: `kuluKriteerium` keskmine ülesande kohta [M4];
  - latentsus: `totalMs` mediaan; `ttftMs` mediaan lisainfoks [M5];
  - stabiilsus: iga ülesande 5 korduse korrektsuse standardhälve (populatsiooni, ddof=0), keskmistatud üle ülesannete [M6];
  - lisaks vigade ja katkenud vastuste arv [PK1].
- [ ] **Min-max** [M8]: korrektsus ja vorming (x − min)/(max − min); hind, latentsus, stabiilsus (max − x)/(max − min); kui max = min, saavad kõik 1.
- [ ] **WSM** [M9]: koondhinne mõlemale profiilile, järjestus, valitud mudel.
- [ ] **Aastane kulu** [PK7]: `kuluKriteerium` keskmine × 10 000 × 365 iga mudeli kohta; tabel iga profiili kohta koos erinevusega valitud mudelist; kahe profiili valikute vahe. USD (eurodeks üks kurss, kirjas eeldusena).
- [ ] **Tundlikkusanalüüs** [M10]: üks kaal korraga 0…1 sammuga 0,05, teised proportsionaalselt (summa 1); tabel, millise kaalu juures võitja vahetub (kriteerium × profiil); 1–2 joonist.
- [ ] **Kategooriate võrdlus** [M11]: kriteeriumid ja min-max kategooria sees, samad kaalud; tabel 3 kategooriat × 2 profiili.
- [ ] Väljund `results/figures/wsm_kontroll_sisend.csv` (kriteeriumide väärtused ja koondhinded) käsitsi kontrolliks failis `wsm_kontroll.xlsx` [M12].

**Valmis, kui:** `run_all.py` loob kõik tabelid ja joonised puhtalt olekult.

## Faas 8 – Valideerimine ja kasutatavuse kriteerium [E2]

**1. Arvutuste õigsus [M12]**
- [ ] Ühiktestid käsitsi arvutatud näidetega (min-max, WSM, stabiilsus, kulu, aastane kulu).
- [ ] Autor kontrollib ühe profiili tulemused failis `wsm_kontroll.xlsx` („Kõik klapivad“).

**2. Korratavus [M13]**
- [ ] `run_all.py` kaks korda samade andmetega → väljundfailide räsid on identsed.
- [ ] Kuues mudel `gpt-6-luna` ainult `config/models.json` reana; `run.luna.json` ~10 ülesandega (igast kategooriast, ilma kohtuniku-ülesanneteta); läbib konveieri, hindamise, kulu ja analüüsi koodi muutmata. Põhivõrdlusesse ei lähe.

**3. Hinnaarvutuse kontroll [PK9]**
- [ ] `kuluArveldatud` summa pakkuja kohta (kõik katse võtmega tehtud päringud: proovipäringud, pilootkatse, põhimõõtmine, Luna) vs armatuurlaud; erinevus protsentides. Autor teeb armatuurlaudadest kuvatõmmised.

**4. Inimhindamine [M14]**
- [ ] Valim 60 vastust põhimõõtmisest, fikseeritud seemnega: 3 kategooriat × 5 mudelit × 4; K3-s iga mudeli kohta 2 reeglitega ja 2 kohtunikuga hinnatud vastust.
- [ ] `results/human/valim.csv` (vastuseId, lähtetekst, ülesanne, vastus; mudeli nimeta, segatud) ja `voti.csv` eraldi.
- [ ] Google Apps Script, mis loob `valim.csv` põhjal Google Formsi: iga vastus eraldi küsimus (ID pealkirjas, tekst kirjelduses), kohustuslik 0/1/2, valikuline kommentaar, järjekord segatud, alguses hindamisjuhend näidetega.
- [ ] Hindajate vastused (Sheets → CSV) → `hinded_hindaja1.csv`, `hinded_hindaja2.csv`.
- [ ] Automaatne korrektsus skaalale 0/1/2: 0 → 0, vahepealne → 1, 1 → 2; kohtuniku mediaan otse.
- [ ] Kaalutud Coheni kappa **lineaarsete kaaludega** (`sklearn cohen_kappa_score(weights="linear")`): h1–h2, h1–auto, h2–auto; lisaks kirjeldavalt eraldi kohtuniku vastuste kohta.

**5. Kasutatavuse tabel [E2]**
- [ ] Tabel nelja tingimusega ja tulemusega: (1) protsess läbitud ja mõlemale profiilile valik tehtud; (2) arvutused õiged ja korratavad (punktid 1–2); (3) h1–auto ja h2–auto kappa ≥ 0,61; (4) hinnaarvutuse erinevus < 5%.

**Valmis, kui:** kõik tulemused on tabelites.

## Faas 9 – Lisad [S9]

- [ ] `README.md`: paigaldus, API-võtmed, Claude Code'i kohtunik, iga sammu käivitamine.
- [ ] Avalik GitHubi repositoorium ilma `.env` failita: kood, testkogum v1.3, kohtuniku juhis, hindajate juhend, toorandmed.

---

## Ajakava

| Aeg | Faasid | Lõputöö tekst samal ajal |
|---|---|---|
| 02.11–08.11 | „Enne alustamist“, 0, 1, 2 | 1. Taust ja varasemad tööd |
| 09.11–15.11 | 3, 3b, 4 | 2. Metoodika (sh E2 kriteerium enne põhimõõtmist) |
| 16.11–18.11 | 5; kohtumine Lepikultiga | 3. Uuringu teostus |
| 19.11–22.11 | 6 (OpenAI sooduhind kehtib kuni 21.11, kontrolli arveldust) | |
| 23.11–28.11 | 7, 8 (inimhindamine ~24.–27.11) | 4. Tulemused, 5. Arutelu, sissejuhatus, kokkuvõte |
| **30.11** | **töö eelkaitsmiseks** | |
| 01.12–05.01 | 9; parandused | lõppversioon |
