// Sõnade ja lausete loendamine ning keelekontroll ülesandepanga definitsioonide järgi
// (ülesandepank: loendamise_definitsioonid, keele_kontroll).
import { franc } from 'franc';

// Sõna = järjestikune mittetühikmärkide jada; eraldajaks üks või mitu Unicode-tühikut.
export function loeSonad(tekst) {
  const t = tekst.trim();
  return t === '' ? 0 : t.split(/\s+/u).length;
}

const LYHENDID = ['mnt', 'tn', 'nt', 'jne', 'nr', 'dr', 'prof'];
const KAITSTUD = [
  /https?:\/\/[^\s]*[^\s.!?]/giu, // URL (lõpus olev lausemärk jääb välja)
  /www\.[^\s]*[^\s.!?]/giu,
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu, // e-posti aadress
  /\d+[.,]\d+/gu, // kümnendmurd 2.4 või 2,4
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${LYHENDID.join('|')})\\.`, 'giu'), // lühendid nt., mnt., ...
];

// Lause lõpeb .!? jadaga, välja arvatud kaitstud konstruktsioonides. Reavahetus ei loo uut lauset.
// Tõlgendus: kui pärast viimast lausemärki on veel teksti (täht või number), loetakse see samuti lauseks.
export function loeLaused(tekst) {
  let t = tekst;
  for (const muster of KAITSTUD) t = t.replace(muster, (m) => m.replace(/[.!?]/g, '_'));
  const osad = t.split(/[.!?]+/u);
  const loppudeArv = osad.length - 1;
  const saba = osad[osad.length - 1];
  return loppudeArv + (/[\p{L}\p{N}]/u.test(saba) ? 1 : 0);
}

// Väljund on nõutud keeles (keel: 'et' või 'en').
// Alates piirist (8 sõna) franc; lühemal väljundil välistav sõnaloendi heuristika.
export function onKeeles(tekst, keel, keeleKontroll) {
  const kk = keeleKontroll;
  if (loeSonad(tekst) >= kk['pikema_väljundi_piir_sõnades']) {
    const valikud = kk.franc_kandidaadid ? { only: kk.franc_kandidaadid } : undefined;
    return franc(tekst, valikud) === kk.franc_koodid[keel];
  }
  const sonad = tekst.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  if (keel === 'et') {
    const keelatud = new Set(kk.heuristika_et['ingliskeelsed_sõnad']);
    return !sonad.some((s) => keelatud.has(s));
  }
  if (keel === 'en') {
    const keelatud = new Set(kk.heuristika_en['eestikeelsed_sõnad']);
    return !/[õäöü]/iu.test(tekst) && !sonad.some((s) => keelatud.has(s));
  }
  throw new Error(`Tundmatu keel: ${keel}`);
}
