// Kategooria 3 reeglid: iga reegel annab true (läbitud) või false.
import { loeSonad, loeLaused, onKeeles } from './tekst.js';
import { koostaRegex } from './regex.js';

const loend = (v) => (Array.isArray(v) ? v : [v]);

export function kontrolliReeglit(reegel, tekst, pank) {
  const { r, v } = reegel;
  switch (r) {
    case 'max_sonu': return loeSonad(tekst) <= v;
    case 'min_sonu': return loeSonad(tekst) >= v;
    case 'sisaldab': return loend(v).every((s) => tekst.includes(s));
    case 'ei_sisalda': return loend(v).every((s) => !tekst.includes(s));
    case 'keel': return onKeeles(tekst, v, pank.keele_kontroll);
    case 'regex_olemas': return koostaRegex(reegel).test(tekst);
    case 'regex_puudub': return !koostaRegex(reegel).test(tekst);
    case 'lausete_arv': return loeLaused(tekst) === v;
    case 'reavahetusi_max': return (tekst.trim().match(/\n/g) ?? []).length <= v;
    default: throw new Error(`Tundmatu reegel: ${r}`);
  }
}

// Tagastab iga reegli tulemuse, et testid näeksid, milline reegel kukkus.
export function kontrolliReegleid(reeglid, tekst, pank) {
  return reeglid.map((reegel) => ({ reegel, labitud: kontrolliReeglit(reegel, tekst, pank) }));
}
