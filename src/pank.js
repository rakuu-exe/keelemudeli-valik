// Ülesandepanga laadimine ja kasutajasõnumi koostamine malli järgi.
import fs from 'node:fs';

export const PANGA_FAIL = new URL('../data/ulesandepank_v1_3.json', import.meta.url);

export function laePank(fail = PANGA_FAIL) {
  return JSON.parse(fs.readFileSync(fail, 'utf8'));
}

// Mall paneb sisendi, juhise ja (K2) skeemi üheks kasutajasõnumiks.
// Asendus tehakse ühe läbimisega, et sisendis olev tekst ei saaks kohatäiteks muutuda.
export function kasutajasonum(ylesanne, pank) {
  const mall = pank['kasutajasõnumi_mall'][`K${ylesanne.kategooria}`];
  if (!mall) throw new Error(`Mall puudub kategooriale ${ylesanne.kategooria}`);
  const vaartused = {
    sisend: ylesanne.sisend,
    juhis: ylesanne.juhis,
    skeem: ylesanne.skeem === undefined ? undefined : JSON.stringify(ylesanne.skeem, null, 2),
  };
  return mall.replace(/\{(sisend|juhis|skeem)\}/g, (_, nimi) => {
    if (vaartused[nimi] === undefined) throw new Error(`${ylesanne.id}: kohatäite {${nimi}} väärtus puudub`);
    return vaartused[nimi];
  });
}
