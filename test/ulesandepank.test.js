// Ülesandepanga v1.3 kontrollskript (PLAN.md faas 0). Käivitamine: npm run kontroll
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { laePank, kasutajasonum } from '../src/pank.js';
import { koostaRegex } from '../src/checkers/regex.js';
import { kontrolliReegleid } from '../src/checkers/reeglid.js';
import { normaliseeri } from '../src/checkers/normaliseeri.js';

const pank = laePank();
const yl = pank['ülesanded'];
const kat = (k) => yl.filter((t) => t.kategooria === k);
const leia = (id) => yl.find((t) => t.id === id);
const andmed = new URL('../data/', import.meta.url);
const naidis = JSON.parse(fs.readFileSync(new URL('./fixtures/k3_naidisvastused.json', import.meta.url), 'utf8')).vastused;

const KOHTUNIKU_YL = ['K3-026', 'K3-027', 'K3-028', 'K3-031', 'K3-033', 'K3-035', 'K3-037', 'K3-039'];
const koikReeglid = (t) => [...(t.kontroll.reeglid ?? []), ...(t.kontroll.lisareeglid ?? [])];
const regexReeglid = yl.flatMap((t) => koikReeglid(t).filter((r) => r.r.startsWith('regex_')).map((r) => ({ id: t.id, r })));

describe('Struktuur', () => {
  test('versioon 1.3 ja 120 unikaalset ülesannet', () => {
    assert.equal(pank.versioon, '1.3');
    assert.equal(yl.length, 120);
    assert.equal(new Set(yl.map((t) => t.id)).size, 120);
  });

  for (const k of [1, 2, 3]) {
    test(`K${k}: 40 ülesannet, raskusastmed 10/15/15`, () => {
      const t = kat(k);
      assert.equal(t.length, 40);
      assert.deepEqual([1, 3, 5].map((r) => t.filter((x) => x.raskus === r).length), [10, 15, 15]);
    });
  }

  test('kohtuniku-ülesanded on täpselt need 8', () => {
    assert.deepEqual(yl.filter((t) => t.kontroll.tuup === 'kohtunik').map((t) => t.id), KOHTUNIKU_YL);
    assert.deepEqual(pank.kohtuniku_juhis['ülesanded'], KOHTUNIKU_YL);
  });
});

describe('v1.3 muudatused', () => {
  test('süsteemijuhist ja mõtlemisrežiimi märkust pole', () => {
    assert.equal(pank['mõõtmisjuhis']['süsteemijuhis'], undefined);
    assert.equal(pank['mõõtmisjuhis']['märkus'], undefined);
  });

  test('franc: eesti keel = ekk, valik eesti ja inglise keele vahel', () => {
    assert.deepEqual(pank.keele_kontroll.franc_koodid, { et: 'ekk', en: 'eng' });
    assert.deepEqual(pank.keele_kontroll.franc_kandidaadid, ['ekk', 'eng']);
  });

  test('ühtegi Pythoni (?i) lippu pole ja kõik 16 regexit kompileeruvad Node\'is', () => {
    assert.equal(regexReeglid.length, 16);
    for (const { id, r } of regexReeglid) {
      assert.ok(!r.v.includes('(?i)'), `${id}: (?i) alles`);
      assert.doesNotThrow(() => koostaRegex(r), `${id}: ${r.v}`);
    }
  });

  test('endised 9 (?i)-regexit ja K3-005 on tõstutundetud', () => {
    const tundetud = regexReeglid.filter(({ r }) => (r.lipud ?? '').includes('i')).map(({ id }) => id);
    assert.deepEqual(tundetud, ['K3-005', 'K3-014', 'K3-019', 'K3-021', 'K3-024', 'K3-030', 'K3-032',
      'K3-038', 'K3-040', 'K3-040']);
  });

  test('K3-005 leiab osalejate arvu ka lause alguses', () => {
    const r = koostaRegex(koikReeglid(leia('K3-005')).find((x) => x.r === 'regex_olemas'));
    for (const s of ['Üheksast kliendist viis oli rahul.', 'Küsitluses osales üheksa klienti.', 'Osales 9 klienti.']) {
      assert.ok(r.test(s), s);
    }
  });

  test('K3-032 lähtetekstis pole tegusõna „viis läbi“', () => {
    assert.ok(!/viis läbi|viidi läbi/.test(leia('K3-032').sisend));
  });
});

describe('Sõnapiirid (K3-032 ja K3-030)', () => {
  const muster = (id) => koostaRegex(koikReeglid(leia(id)).find((r) => r.r === 'regex_puudub'));
  const juhtumid = {
    'K3-032': {
      leiab: ['Üks klient jättis vastamata.', 'viie kliendi hinnang', 'üheksast osalejast',
        'kolmandik vastanutest', 'Osales 9 klienti.', 'kahe kliendi arvates'],
      eiLeia: ['Ettevõte viis läbi kliendiküsitluse.', 'ükski ei keeldunud', 'üksikasjalik küsitlus',
        'kolmapäeval saadeti', 'enamik oli rahul'],
    },
    'K3-030': {
      leiab: ['Tegevjuhi sõnul kasv jätkub.', 'CEO sõnul', 'CEO-d usuvad', 'direktori hinnangul',
        'juhi sõnul', 'juhatuse esimees märkis'],
      eiLeia: ['Kasvu juhtisid tellimusteenused.', 'kasv oli juhitud tellimustest',
        'Juhtkonna hinnangul jätkub', 'ettevõte juhib turgu'],
    },
  };
  for (const [id, { leiab, eiLeia }] of Object.entries(juhtumid)) {
    for (const s of leiab) test(`${id} leiab: „${s}“`, () => assert.ok(muster(id).test(s)));
    for (const s of eiLeia) test(`${id} ei leia: „${s}“`, () => assert.ok(!muster(id).test(s)));
  }
});

describe('Kasutajasõnumi mall', () => {
  test('K1-001 sõnum on täpselt malli järgi', () => {
    const t = leia('K1-001');
    assert.equal(kasutajasonum(t, pank), `Tekst:\n${t.sisend}\n\n${t.juhis}`);
  });

  test('K2-001 sõnumis on skeem JSON-ina', () => {
    const t = leia('K2-001');
    assert.equal(kasutajasonum(t, pank), `Tekst:\n${t.sisend}\n\nSkeem:\n${JSON.stringify(t.skeem, null, 2)}\n\n${t.juhis}`);
  });

  test('kõigi 120 ülesande sõnum koostub ja kohatäiteid ei jää', () => {
    for (const t of yl) {
      const s = kasutajasonum(t, pank);
      assert.ok(!/\{(sisend|juhis|skeem)\}/.test(s), t.id);
      assert.ok(s.includes(t.sisend) && s.endsWith(t.juhis), t.id);
    }
  });
});

describe('K1: lubatud vastused on normaliseerimise järel saavutatavad', () => {
  for (const t of kat(1)) {
    test(t.id, () => {
      const { lubatud, normaliseeri: sammud } = t.kontroll;
      for (const l of lubatud) {
        assert.ok(lubatud.includes(normaliseeri(l, sammud)), `„${l}“ ei normaliseeru iseendaks`);
        // Tüüpiline õige vastus: suur algustäht ja lõpupunkt (kui need sammud on loendis)
        let kaunistatud = l;
        if (sammud.includes('vaiketahed')) kaunistatud = kaunistatud[0].toUpperCase() + kaunistatud.slice(1);
        if (sammud.includes('eemalda_lopupunkt')) kaunistatud += '.';
        if (sammud.includes('eemalda_eessona')) kaunistatud = 'Vastus: ' + kaunistatud;
        assert.ok(lubatud.includes(normaliseeri(` ${kaunistatud} `, sammud)), `„${kaunistatud}“`);
      }
    });
  }
});

describe('K2: etalonid ja JSON-skeemid', () => {
  const register = JSON.parse(fs.readFileSync(new URL(pank.json_schema_register, andmed), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const valideerijad = new Map();
  const lae = (id) => {
    if (!valideerijad.has(id)) {
      const skeem = JSON.parse(fs.readFileSync(new URL(register.schemas[id], andmed), 'utf8'));
      valideerijad.set(id, { skeem, valideeri: ajv.compile(skeem) });
    }
    return valideerijad.get(id);
  };

  for (const t of kat(2)) {
    test(t.id, () => {
      assert.equal(register.schemas[t.id], t.json_schema, 'register ja ülesanne viitavad samale failile');
      const { skeem, valideeri } = lae(t.id);
      const oodatud = structuredClone(t.kontroll.etalon);
      for (const v of t.kontroll.null_ootus ?? []) oodatud[v] = null;

      // väljad on kõikjal samad: ülesande skeem, JSON-skeem, etalon
      const valjad = (o) => Object.keys(o).sort();
      assert.deepEqual(valjad(oodatud), valjad(skeem.properties), 'etalon vs JSON-skeem');
      assert.deepEqual(valjad(t.skeem), valjad(skeem.properties), 'ülesande skeem vs JSON-skeem');

      assert.ok(valideeri(oodatud), `etalon ei läbi skeemi: ${JSON.stringify(valideeri.errors)}`);
      const [esimene] = Object.keys(skeem.properties);
      const puudub = structuredClone(oodatud); delete puudub[esimene];
      assert.ok(!valideeri(puudub), `puuduv väli „${esimene}“ läbis`);
      assert.ok(!valideeri({ ...oodatud, lisaväli: 'x' }), 'lisaväli läbis');
      for (const [k, s] of Object.entries(skeem.properties)) {
        if (s.pattern?.includes('\\d{4}')) assert.ok(!valideeri({ ...oodatud, [k]: '03.04.2024' }), `kuupäev „${k}“ vale kujuga läbis`);
      }
    });
  }

  test('lubamatu enum-väärtus kukub (K2-039, K2-035)', () => {
    assert.ok(!lae('K2-039').valideeri({ staatus: 'OOTEL' }));
    assert.ok(!lae('K2-035').valideeri({ ...leia('K2-035').kontroll.etalon, 'tüüp': 'ARVE_KREEDIT' }));
  });
});

describe('K3: näidisvastus läbib oma reeglid (kohtuniku-ülesannetel lisareeglid)', () => {
  test('näidisvastus on igal K3 ülesandel', () => {
    assert.deepEqual(Object.keys(naidis).sort(), kat(3).map((t) => t.id).sort());
  });
  for (const t of kat(3)) {
    test(t.id, () => {
      const reeglid = t.kontroll.tuup === 'kohtunik' ? t.kontroll.lisareeglid : t.kontroll.reeglid;
      const kukkunud = kontrolliReegleid(reeglid, naidis[t.id], pank).filter((x) => !x.labitud);
      assert.deepEqual(kukkunud.map((x) => `${x.reegel.r}=${JSON.stringify(x.reegel.v)}`), []);
    });
  }
});
