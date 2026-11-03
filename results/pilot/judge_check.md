# Review of judge scores: pilot

20 of 40 judge files, drawn with seed 20261103. The model name is not shown.
For each one: read the rubric, the source text and the answer, write your own score (0, 1 or 2), and say whether the judge's scores are right.

## 1. H6543

**Instruction:** Võta kokku ühe lausega.

**Rubric:** 0 = kokkuvõte väidab, et kampaania põhjustas kasvu. 1 = põhjuslikkust vihjatakse, kuid ei väideta otse. 2 = mõlemad faktid on esitatud ilma põhjusliku seoseta.

**Source text:**

~~~text
Müük kasvas teises kvartalis 8 protsenti. Samal perioodil käivitati uus reklaamikampaania.
~~~

**Answer:**

~~~text
Teises kvartalis kasvas müük 8 protsenti ning samal perioodil käivitati uus reklaamikampaania.
~~~

**Judge:**

- repeat 1: score 2 — Mõlemad faktid on esitatud ühes lauses ja ühendatud neutraalselt sõnaga „ning“. Kampaania ja müügikasvu vahel ei väideta ega vihjata põhjuslikku seost. Vastus vastab rubriigi tasemele 2.
- repeat 2: score 2 — Kokkuvõte esitab mõlemad faktid ühes lauses ja seob need neutraalselt sidesõnaga „ning“. Ajaline kõrvutus põhjuslikku seost ei väida ega vihja sellele, seega vastab vastus rubriigi kõrgeimale tasemele.
- repeat 3: score 2 — Mõlemad faktid on esitatud ühes lauses ja ühendatud neutraalse sidesõnaga „ning“. Põhjuslikku seost ei väideta ega vihjata, nii et vastus vastab rubriigi kõrgeimale tasemele.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 2. H7165

**Instruction:** Võta kokku ühe lausega.

**Rubric:** 0 = kokkuvõte esitab kiireima staatuse faktina. 1 = allikas on mainitud, kuid mõõtmiste puudumine on kadunud. 2 = nii väite allikas kui sõltumatute mõõtmiste puudumine säilivad.

**Source text:**

~~~text
Ettevõtte pressiteate kohaselt on uus mudel turu kiireim. Sõltumatuid mõõtmisi ei ole veel avaldatud.
~~~

**Answer:**

~~~text
Ettevõte väidab pressiteates, et uus mudel on turu kiireim, kuid sõltumatuid mõõtmisi pole veel avaldatud.
~~~

**Judge:**

- repeat 1: score 2 — Kokkuvõte on üks lause. See esitab kiireima staatuse ettevõtte pressiteate väitena ega esita seda faktina. Ka sõltumatute mõõtmiste puudumine on säilinud.
- repeat 2: score 2 — Ühelauseline kokkuvõte, kus väite allikas (ettevõtte pressiteade) on alles ja on öeldud, et sõltumatuid mõõtmisi pole veel avaldatud. Rubriigi tase 2 on täidetud.
- repeat 3: score 2 — Kokkuvõte on üks lause ja säilitab mõlemad olulised osad: väite allikas on ettevõtte pressiteade ning sõltumatuid mõõtmisi pole veel avaldatud.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 3. H1089

**Instruction:** Võta leid kokku ühe lausega.

**Rubric:** 0 = kokkuvõte väidab, et seos leiti, või et seose puudumine on tõestatud. 1 = eitus säilib, kuid 'statistiliselt oluline' on kadunud. 2 = eitus ja määratlus mõlemad säilivad.

**Source text:**

~~~text
Uuring ei leidnud statistiliselt olulist seost kohvitarbimise ja unehäirete vahel.
~~~

**Answer:**

~~~text
Uuring ei leidnud kohvitarbimise ja unehäirete vahel statistiliselt olulist seost.
~~~

**Judge:**

- repeat 1: score 2 — Kokkuvõttes on säilinud nii eitus ("ei leidnud") kui ka määratlus "statistiliselt oluline". Seost ei väideta leitud olevat ega selle puudumist tõestatud olevat.
- repeat 2: score 2 — Kokkuvõttes on alles nii eitus („ei leidnud“) kui ka määratlus „statistiliselt oluline“. Seose puudumist ei esitata tõestatuna ja sisu vastab täpselt lähtetekstile.
- repeat 3: score 2 — Vastuses on säilinud nii eitus („ei leidnud“) kui ka määratlus „statistiliselt oluline“. Seose puudumist ei esitata tõestatuna ja vastus on üks lause.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 4. H8493

**Instruction:** Võta kokku ühe lausega.

**Rubric:** 0 = kokkuvõte väidab, et kampaania põhjustas kasvu. 1 = põhjuslikkust vihjatakse, kuid ei väideta otse. 2 = mõlemad faktid on esitatud ilma põhjusliku seoseta.

**Source text:**

~~~text
Müük kasvas teises kvartalis 8 protsenti. Samal perioodil käivitati uus reklaamikampaania.
~~~

**Answer:**

~~~text
Teises kvartalis kasvas müük 8 protsenti ning käivitati uus reklaamikampaania.
~~~

**Judge:**

- repeat 1: score 2 — Mõlemad faktid on toodud ühes lauses ja ühendatud neutraalse sidesõnaga „ning“. Põhjuslikku seost ei väideta ega vihjata, nii et vastus vastab rubriigi tasemele 2.
- repeat 2: score 2 — Kokkuvõttes on mõlemad faktid ühes lauses ja need on seotud ainult sidesõnaga „ning“. Põhjuslikku seost ei väideta ega vihjata, nii et vastus on lähtetekstiga kooskõlas.
- repeat 3: score 2 — Mõlemad faktid on esitatud ühes lauses ja ühendatud neutraalse sidesõnaga „ning“. Põhjuslikku seost ei väideta ega vihjata, seega vastab vastus rubriigi kõrgeimale tasemele.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 5. H1632

**Instruction:** Võta kokku kuni 30 sõnaga.

**Rubric:** 0 = kokkuvõte väidab või vihjab, et vanemate versioonide tugi on juba lõppenud. 1 = ajaline suhe on ebaselge. 2 = tulevikuline tähtaeg on selgelt edasi antud.

**Source text:**

~~~text
Tarkvara versioon 4.2 parandas 17 viga ja lisas kaks uut funktsiooni. Uuendus on tasuta kõigile olemasolevatele klientidele. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

**Answer:**

~~~text
Tarkvara versioon 4.2 parandas 17 viga ja lisas kaks uut funktsiooni. Uuendus on klientidele tasuta, vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

**Judge:**

- repeat 1: score 2 — Kokkuvõttes on sama tulevikku viitav vorm „tugi lõpeb 1. juunil 2026” mis lähtetekstis. Vastus ei väida, et tugi on juba lõppenud, ja jääb 30 sõna piiresse.
- repeat 2: score 2 — Kokkuvõte kordab lähteteksti sõnastust „tugi lõpeb 1. juunil 2026“. Olevik „lõpeb“ väljendab tulevikku, seega tähtaeg on selgelt tulevikuline. Kokkuvõte jääb 30 sõna piiresse.
- repeat 3: score 2 — Kokkuvõte ütleb „tugi lõpeb 1. juunil 2026“, nagu lähtetekstis. Tähtaeg on edasi antud tulevikuna ega vihja, et tugi oleks juba lõppenud. Sõnapiir on täidetud.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 6. H8478

**Instruction:** Sõnasta sama otsus kliendisõbralikumalt, kuid ära muuda otsuse sisu. Kuni 40 sõna.

**Rubric:** 0 = otsuse sisu on muutunud (nt jäetakse mulje, et taotlust saab veel esitada või et otsus pole lõplik). 1 = sisu säilib, kuid üks kahest põhjusest on kadunud. 2 = otsus ja mõlemad põhjused säilivad, toon on viisakam.

**Source text:**

~~~text
Teie taotlus jäeti rahuldamata, kuna esitatud dokumendid ei vastanud nõuetele ja tähtaeg on möödunud.
~~~

**Answer:**

~~~text
Kahjuks ei saanud me teie taotlust rahuldada, sest esitatud dokumendid ei vastanud kehtestatud nõuetele ja taotluse esitamise tähtaeg oli juba möödunud. Täname teid taotluse esitamise eest ning vastame hea meelega edasistele küsimustele.
~~~

**Judge:**

- repeat 1: score 2 — Rahuldamata jätmise otsus ja mõlemad põhjused (nõuetele mittevastavad dokumendid, möödunud tähtaeg) on säilinud. Toon on viisakam ja vastus jääb 40 sõna piiresse (32 sõna).
- repeat 2: score 2 — Otsus on endiselt lõplik ja mõlemad põhjused on alles: dokumendid ei vastanud nõuetele ja tähtaeg oli möödunud. Toon on viisakam, uue taotluse võimalusele ei viidata ning pikkus on 32 sõna.
- repeat 3: score 2 — Otsus jääb lõplikuks ja mõlemad põhjused on alles: dokumendid ei vastanud nõuetele ja tähtaeg oli möödunud. Toon on viisakam ja vastuses on 32 sõna.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 7. H3057

**Instruction:** Võta tekst kokku kuni 30 sõnaga.

**Rubric:** 0 = kokkuvõte sisaldab väiteid, mida lähtetekstis ei ole (nt arhitekt, rahastaja, hoone nimi). 1 = kõik väited on tekstist tuletatavad, kuid mõni detail on ebatäpne. 2 = kõik väited on lähtetekstiga kaetud.

**Source text:**

~~~text
Uus raamatukogu avati Tartus möödunud reedel. Hoone maksumus oli 8,5 miljonit eurot ja ehitus kestis kaks aastat. Avapäeval külastas hoonet üle kolme tuhande inimese.
~~~

**Answer:**

~~~text
Tartus avati uus raamatukogu, mis maksis 8,5 miljonit eurot ja mille avapäeval käis üle 3000 inimese.
~~~

**Judge:**

- repeat 1: score 2 — Kõik väited (Tartu, uus raamatukogu, 8,5 miljonit eurot, üle 3000 külastaja avapäeval) on lähtetekstiga kaetud. Lisatud või ebatäpseid detaile ei ole ja pikkus jääb alla 30 sõna.
- repeat 2: score 2 — Kõik väited (Tartu, uus raamatukogu, 8,5 miljonit eurot, avapäeval üle 3000 külastaja) on lähtetekstis kirjas. Lisandeid pole ja kokkuvõte jääb alla 30 sõna.
- repeat 3: score 2 — Kõik väited (Tartu, uus raamatukogu, 8,5 miljonit eurot, avapäeval üle 3000 külastaja) on lähtetekstiga kaetud. Lisaväiteid ega ebatäpsusi ei ole ja sõnapiirang on täidetud.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 8. H8399

**Instruction:** Võta kokku ühe lausega.

**Rubric:** 0 = kokkuvõte esitab kiireima staatuse faktina. 1 = allikas on mainitud, kuid mõõtmiste puudumine on kadunud. 2 = nii väite allikas kui sõltumatute mõõtmiste puudumine säilivad.

**Source text:**

~~~text
Ettevõtte pressiteate kohaselt on uus mudel turu kiireim. Sõltumatuid mõõtmisi ei ole veel avaldatud.
~~~

**Answer:**

~~~text
Ettevõtte väitel on uus mudel turu kiireim, kuid sõltumatud mõõtmised puuduvad.
~~~

**Judge:**

- repeat 1: score 2 — Väite allikas („ettevõtte väitel”) on alles ja sõltumatute mõõtmiste puudumine on mainitud. Väike nüanss: lähtetekstis öeldakse „ei ole veel avaldatud”, vastuses „puuduvad”.
- repeat 2: score 2 — Kokkuvõte on üks lause. Väite allikas on säilinud („ettevõtte väitel“) ja sõltumatute mõõtmiste puudumine on samuti alles. Kiireima staatust ei esitata faktina.
- repeat 3: score 2 — Väite allikas (ettevõtte väide) on säilinud ja sõltumatute mõõtmiste puudumine on märgitud. Puudub ainult nüanss „veel avaldamata”, kuid rubriigi nõuded on täidetud.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 9. H7575

**Instruction:** Võta kokku kuni 30 sõnaga.

**Rubric:** 0 = kokkuvõte väidab või vihjab, et vanemate versioonide tugi on juba lõppenud. 1 = ajaline suhe on ebaselge. 2 = tulevikuline tähtaeg on selgelt edasi antud.

**Source text:**

~~~text
Tarkvara versioon 4.2 parandas 17 viga ja lisas kaks uut funktsiooni. Uuendus on tasuta kõigile olemasolevatele klientidele. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

**Answer:**

~~~text
Versioon 4.2 parandab 17 viga, lisab kaks funktsiooni ja on olemasolevatele klientidele tasuta. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

**Judge:**

- repeat 1: score 2 — Kokkuvõte kordab lähteteksti sõnastust „tugi lõpeb 1. juunil 2026“, seega tähtaeg on tulevikulisena selgelt edasi antud. Vastus mahub 30 sõna piiresse ja on täpne.
- repeat 2: score 2 — Kokkuvõte kasutab nagu lähtetekst vormi „lõpeb 1. juunil 2026”, mis annab tähtaja edasi tulevikulisena. Ei väida, et tugi on juba lõppenud. Pikkus jääb alla 30 sõna.
- repeat 3: score 2 — Kokkuvõte kordab lähteteksti sõnastust „tugi lõpeb 1. juunil 2026”, nii et tähtaeg on edasi antud tulevikuna. Ei väida, et tugi oleks lõppenud. Pikkus jääb alla 30 sõna.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 10. H5001

**Instruction:** Võta tekst kokku kuni 25 sõnaga.

**Rubric:** 0 = mõni arv on kokkuvõttes muudetud või juurde leiutatud. 1 = arvud on õiged, kuid üks on kontekstist välja rebitud. 2 = kõik esitatud arvud vastavad lähtetekstile.

**Source text:**

~~~text
Tallinnas toimunud tehnoloogiakonverentsil osales 127 inimest 14 riigist. Korraldajad teatasid, et järgmise aasta eelarve on 2,4 miljonit eurot. Konverentsi peaesineja oli Soome ettevõtte tehnoloogiajuht.
~~~

**Answer:**

~~~text
Tallinna tehnoloogiakonverentsil osales 127 inimest 14 riigist. Peaesineja oli Soome ettevõtte tehnoloogiajuht, järgmise aasta eelarve on 2,4 miljonit eurot.
~~~

**Judge:**

- repeat 1: score 2 — Kõik arvud vastavad lähtetekstile ja on õiges kontekstis: 127 osalejat, 14 riiki ning järgmise aasta eelarve 2,4 miljonit eurot. Midagi pole muudetud ega juurde mõeldud.
- repeat 2: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) vastavad lähtetekstile ja on esitatud õiges kontekstis. Kokkuvõttes on 19 sõna.
- repeat 3: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) vastavad lähtetekstile ja on õiges kontekstis. Ühtegi arvu pole muudetud ega juurde leiutatud.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 11. H2307

**Instruction:** Võta küsitluse tulemused kokku ühe lausega.

**Rubric:** 0 = kokkuvõte üldistab valesti, väites või vihjates, et enamik või suur osa klientidest oli rahulolematu. 1 = arvud on õiged, kuid sõnastus jätab proportsioonist eksitava mulje. 2 = proportsioon on edasi antud korrektselt (vähemus oli negatiivne).

**Source text:**

~~~text
Ettevõte viis läbi kliendiküsitluse, milles osales üheksa klienti. Kolm neist andis teenusele negatiivse hinnangu, viis positiivse ja üks jättis vastamata. Küsitlus viidi läbi e-posti teel märtsis.
~~~

**Answer:**

~~~text
Märtsis e-posti teel korraldatud kliendiküsitlusel osales üheksa klienti, kellest viis hindas teenust positiivselt, kolm negatiivselt ja üks jättis vastamata.
~~~

**Judge:**

- repeat 1: score 2 — Arvud on õiged ja positiivsed hinnangud on toodud esimesena. Sõnastusest on selge, et negatiivse hinnangu andis vähemus. Proportsioon on edasi antud korrektselt.
- repeat 2: score 2 — Arvud on õiged: 9 vastajat, 5 positiivset, 3 negatiivset ja 1 vastamata. Positiivsed on mainitud esimesena, seega jääb selgelt mulje, et negatiivseid hinnanguid andis vähemus.
- repeat 3: score 2 — Arvud on õiged ja positiivsed hinnangud on mainitud esimesena, seega on selge, et negatiivseid hinnanguid andis vähemus. Kokkuvõte ei anna proportsioonist eksitavat muljet.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 12. H2661

**Instruction:** Võta tekst kokku kuni 25 sõnaga.

**Rubric:** 0 = mõni arv on kokkuvõttes muudetud või juurde leiutatud. 1 = arvud on õiged, kuid üks on kontekstist välja rebitud. 2 = kõik esitatud arvud vastavad lähtetekstile.

**Source text:**

~~~text
Tallinnas toimunud tehnoloogiakonverentsil osales 127 inimest 14 riigist. Korraldajad teatasid, et järgmise aasta eelarve on 2,4 miljonit eurot. Konverentsi peaesineja oli Soome ettevõtte tehnoloogiajuht.
~~~

**Answer:**

~~~text
Tallinnas toimunud tehnoloogiakonverentsil osales 127 inimest 14 riigist; järgmise aasta eelarve on 2,4 miljonit eurot ja peaesineja oli Soome ettevõtte tehnoloogiajuht.
~~~

**Judge:**

- repeat 1: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) vastavad lähtetekstile ja on õiges kontekstis. Ühtegi arvu pole muudetud ega juurde lisatud.
- repeat 2: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) vastavad lähtetekstile ja on õiges kontekstis. Kokkuvõte on 21 sõna, seega jääb 25 sõna piiresse.
- repeat 3: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) on lähtetekstiga samad ja õiges kontekstis. Kokkuvõttes on 21 sõna, seega jääb see piirangu sisse.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 13. H3666

**Instruction:** Võta tekst kokku kuni 30 sõnaga.

**Rubric:** 0 = kokkuvõte sisaldab väiteid, mida lähtetekstis ei ole (nt arhitekt, rahastaja, hoone nimi). 1 = kõik väited on tekstist tuletatavad, kuid mõni detail on ebatäpne. 2 = kõik väited on lähtetekstiga kaetud.

**Source text:**

~~~text
Uus raamatukogu avati Tartus möödunud reedel. Hoone maksumus oli 8,5 miljonit eurot ja ehitus kestis kaks aastat. Avapäeval külastas hoonet üle kolme tuhande inimese.
~~~

**Answer:**

~~~text
Tartus avati reedel uus raamatukogu, mis maksis 8,5 miljonit eurot ja ehitati kaks aastat. Avapäeval külastas seda üle kolme tuhande inimese.
~~~

**Judge:**

- repeat 1: score 2 — Kõik väited (Tartu, reede, 8,5 miljonit, kaks aastat, üle kolme tuhande külastaja) on lähtetekstis olemas. Uusi fakte ei lisata, pikkus jääb 30 sõna piiresse.
- repeat 2: score 2 — Kõik väited (Tartu, reede, 8,5 miljonit eurot, kaks aastat, üle kolme tuhande külastaja) on lähtetekstis olemas. Lisandusi pole ja vastus jääb alla 30 sõna.
- repeat 3: score 2 — Kõik väited (Tartu, reede, 8,5 miljonit, kaks aastat, üle kolme tuhande külastaja) on lähtetekstis olemas. Lisandusi ega ebatäpsusi ei ole. Pikkus on 21 sõna.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 14. H6303

**Instruction:** Võta kokku ühe lausega.

**Rubric:** 0 = kokkuvõte esitab kiireima staatuse faktina. 1 = allikas on mainitud, kuid mõõtmiste puudumine on kadunud. 2 = nii väite allikas kui sõltumatute mõõtmiste puudumine säilivad.

**Source text:**

~~~text
Ettevõtte pressiteate kohaselt on uus mudel turu kiireim. Sõltumatuid mõõtmisi ei ole veel avaldatud.
~~~

**Answer:**

~~~text
Kuigi ettevõtte teatel on nende uus mudel turu kiireim, pole selle kohta veel sõltumatuid mõõtmistulemusi avaldatud.
~~~

**Judge:**

- repeat 1: score 2 — Vastus on üks lause. Selles on alles nii väite allikas (ettevõtte teatel) kui ka see, et sõltumatuid mõõtmisi pole veel avaldatud. See vastab rubriigi 2. tasemele.
- repeat 2: score 2 — Kokkuvõte on üks lause. Väite allikas („ettevõtte teatel“) on säilinud ja on öeldud, et sõltumatuid mõõtmistulemusi pole veel avaldatud. Kiireima mudeli staatust ei esitata faktina.
- repeat 3: score 2 — Kokkuvõte on üks lause. Selles on alles nii väite allikas (ettevõtte teatel) kui ka see, et sõltumatuid mõõtmisi pole veel avaldatud. Kiireima staatust ei esitata faktina.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 15. H6132

**Instruction:** Võta tekst kokku kuni 30 sõnaga.

**Rubric:** 0 = kokkuvõte sisaldab väiteid, mida lähtetekstis ei ole (nt arhitekt, rahastaja, hoone nimi). 1 = kõik väited on tekstist tuletatavad, kuid mõni detail on ebatäpne. 2 = kõik väited on lähtetekstiga kaetud.

**Source text:**

~~~text
Uus raamatukogu avati Tartus möödunud reedel. Hoone maksumus oli 8,5 miljonit eurot ja ehitus kestis kaks aastat. Avapäeval külastas hoonet üle kolme tuhande inimese.
~~~

**Answer:**

~~~text
Tartus avati möödunud reedel kahe aastaga valminud uus raamatukogu, mis läks maksma 8,5 miljonit eurot. Avapäeval külastas seda üle kolme tuhande inimese.
~~~

**Judge:**

- repeat 1: score 2 — Kõik väited (Tartu, möödunud reede, kaks aastat, 8,5 miljonit eurot, üle kolme tuhande külastaja) on lähtetekstis olemas. Lisandusi ega ebatäpsusi ei ole. Kokkuvõttes on 22 sõna.
- repeat 2: score 2 — Kõik väited on lähtetekstis olemas: Tartu, möödunud reede, kaks aastat, 8,5 miljonit eurot, üle kolme tuhande külastaja. Lisandusi ega ebatäpsusi pole, 22 sõna.
- repeat 3: score 2 — Kõik väited (Tartu, möödunud reede, kaks aastat, 8,5 miljonit eurot, üle kolme tuhande külastaja) on lähtetekstis olemas. Kokkuvõte on 22 sõna ja lisandusi ei ole.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 16. H2067

**Instruction:** Võta kokku kuni 30 sõnaga.

**Rubric:** 0 = kokkuvõte väidab või vihjab, et vanemate versioonide tugi on juba lõppenud. 1 = ajaline suhe on ebaselge. 2 = tulevikuline tähtaeg on selgelt edasi antud.

**Source text:**

~~~text
Tarkvara versioon 4.2 parandas 17 viga ja lisas kaks uut funktsiooni. Uuendus on tasuta kõigile olemasolevatele klientidele. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

**Answer:**

~~~text
Tarkvara versioon 4.2 toob olemasolevatele klientidele tasuta veaparandused ja kaks uut funktsiooni. Vanemate versioonide tugi lõpeb 1. juunil 2026.
~~~

**Judge:**

- repeat 1: score 2 — Kokkuvõte kasutab nagu lähtetekstki vormi „lõpeb 1. juunil 2026”, mis annab tähtaja edasi tulevikuna. Ei väideta, et tugi oleks juba lõppenud. Pikkus jääb alla 30 sõna.
- repeat 2: score 2 — Kokkuvõttes on lähteteksti sõnastus „tugi lõpeb 1. juunil 2026” täpselt alles. Tähtaeg on selgelt tulevikus. Kokkuvõte ei väida, et tugi oleks juba lõppenud, ja jääb 30 sõna piiresse.
- repeat 3: score 2 — Kokkuvõte kordab lähteteksti olevikuvormi „tugi lõpeb 1. juunil 2026” ja annab tähtaja edasi tulevikuna. See ei väida ega vihja, et tugi on juba lõppenud. Pikkus jääb 30 sõna piiresse.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 17. H6854

**Instruction:** Võta tekst kokku kuni 30 sõnaga.

**Rubric:** 0 = kokkuvõte sisaldab väiteid, mida lähtetekstis ei ole (nt arhitekt, rahastaja, hoone nimi). 1 = kõik väited on tekstist tuletatavad, kuid mõni detail on ebatäpne. 2 = kõik väited on lähtetekstiga kaetud.

**Source text:**

~~~text
Uus raamatukogu avati Tartus möödunud reedel. Hoone maksumus oli 8,5 miljonit eurot ja ehitus kestis kaks aastat. Avapäeval külastas hoonet üle kolme tuhande inimese.
~~~

**Answer:**

~~~text
Tartus avati möödunud reedel uus raamatukogu, mille ehitus maksis 8,5 miljonit eurot ja kestis kaks aastat. Avapäeval külastas hoonet üle kolme tuhande inimese.
~~~

**Judge:**

- repeat 1: score 2 — Kõik väited on lähtetekstis olemas: avamise koht ja aeg, 8,5 miljonit eurot, kaks aastat ja üle 3000 külastaja. Sõnastus „ehitus maksis“ vastab sisuliselt hoone maksumusele. Kokkuvõttes on 23 sõna.
- repeat 2: score 2 — Kõik väited on lähtetekstis olemas: avamise aeg ja koht, 8,5 miljonit eurot, kaks aastat ja üle 3000 külastaja. Väljamõeldisi pole. „Ehitus maksis“ on sisuliselt sama mis hoone maksumus.
- repeat 3: score 2 — Kõik väited (koht, aeg, 8,5 miljonit, kaks aastat, üle 3000 külastaja) on lähtetekstiga kaetud. Väljamõeldud detaile ei ole ja 23 sõnaga jääb vastus piirangu sisse.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 18. H5708

**Instruction:** Võta kokku ühe lausega.

**Rubric:** 0 = kokkuvõte väidab, et kampaania põhjustas kasvu. 1 = põhjuslikkust vihjatakse, kuid ei väideta otse. 2 = mõlemad faktid on esitatud ilma põhjusliku seoseta.

**Source text:**

~~~text
Müük kasvas teises kvartalis 8 protsenti. Samal perioodil käivitati uus reklaamikampaania.
~~~

**Answer:**

~~~text
Teises kvartalis kasvas müük 8 protsenti ning samal ajal käivitati uus reklaamikampaania.
~~~

**Judge:**

- repeat 1: score 2 — Vastuses on mõlemad faktid ühes lauses ja neid seob ainult ajaline „samal ajal“. Põhjuslikku seost ei väideta ega vihjata, nii et vastus on lähtetekstiga kooskõlas.
- repeat 2: score 2 — Kokkuvõttes on mõlemad faktid ühes lauses ja need on seotud neutraalselt sõnadega „ning samal ajal”. Põhjuslikku seost ei väideta ega vihjata.
- repeat 3: score 2 — Mõlemad faktid on esitatud ühes lauses ja ühendatud ainult sõnadega "ning samal ajal". Põhjuslikku seost ei väideta ega vihjata, nagu rubriik nõuab.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 19. H2247

**Instruction:** Võta tekst kokku kuni 25 sõnaga.

**Rubric:** 0 = mõni arv on kokkuvõttes muudetud või juurde leiutatud. 1 = arvud on õiged, kuid üks on kontekstist välja rebitud. 2 = kõik esitatud arvud vastavad lähtetekstile.

**Source text:**

~~~text
Tallinnas toimunud tehnoloogiakonverentsil osales 127 inimest 14 riigist. Korraldajad teatasid, et järgmise aasta eelarve on 2,4 miljonit eurot. Konverentsi peaesineja oli Soome ettevõtte tehnoloogiajuht.
~~~

**Answer:**

~~~text
Tallinna tehnoloogiakonverentsil osales 127 inimest 14 riigist; peaesineja oli Soome ettevõtte tehnoloogiajuht ning korraldajate järgmise aasta eelarve on 2,4 miljonit eurot.
~~~

**Judge:**

- repeat 1: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) on õiged ja õiges kontekstis. Kokkuvõte on 21-sõnaline, ühtegi arvu pole juurde leiutatud.
- repeat 2: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) vastavad lähtetekstile ja on õiges kontekstis. Kokkuvõttes on 21 sõna, seega jääb see lubatud piiridesse.
- repeat 3: score 2 — Kõik arvud (127, 14, 2,4 miljonit eurot) vastavad lähtetekstile ja on õiges kontekstis. Kokkuvõttes on 21 sõna, seega jääb see lubatud piiridesse.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 

## 20. H9807

**Instruction:** Võta küsitluse tulemused kokku ühe lausega.

**Rubric:** 0 = kokkuvõte üldistab valesti, väites või vihjates, et enamik või suur osa klientidest oli rahulolematu. 1 = arvud on õiged, kuid sõnastus jätab proportsioonist eksitava mulje. 2 = proportsioon on edasi antud korrektselt (vähemus oli negatiivne).

**Source text:**

~~~text
Ettevõte viis läbi kliendiküsitluse, milles osales üheksa klienti. Kolm neist andis teenusele negatiivse hinnangu, viis positiivse ja üks jättis vastamata. Küsitlus viidi läbi e-posti teel märtsis.
~~~

**Answer:**

~~~text
Üheksast küsitluses osalenud kliendist viis hindas teenust positiivselt, kolm negatiivselt ja üks jättis vastamata.
~~~

**Judge:**

- repeat 1: score 2 — Arvud on õiged: 5 positiivset, 3 negatiivset ja 1 vastamata. Positiivsed on esikohal, seega jääb selgelt mulje, et negatiivseid hinnanguid andis vähemus. Eksitavat üldistust vastuses pole.
- repeat 2: score 2 — Arvud on õiged ja positiivsed hinnangud on mainitud esimesena, seega on selge, et negatiivsed hinnangud olid vähemuses. Proportsioon on edasi antud korrektselt ja eksitavat muljet ei teki.
- repeat 3: score 2 — Arvud on õiged ja positiivsed hinnangud on esimesena. See näitab selgelt, et negatiivse hinnangu andis vähemus. Proportsioon on edasi antud korrektselt ja eksitavat muljet ei teki.

Median 2 → correctness 1

**Your score (0/1/2):** 

**Check:** 
