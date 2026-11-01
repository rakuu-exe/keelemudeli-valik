// Kategooria 1 vastuse normaliseerimine ülesandepanga 'normaliseerimised' järgi.
// Sammud rakendatakse ülesande loendis antud järjekorras.

const KUUD = ['jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli', 'august',
  'september', 'oktoober', 'november', 'detsember'];
const kaks = (n) => String(n).padStart(2, '0');

function kuupaevIso(s) {
  let m = s.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})$/u); // 3.02.2025, 03.02.2025
  if (m) return `${m[3]}-${kaks(m[2])}-${kaks(m[1])}`;
  m = s.match(/^(\d{1,2})\.\s*(\p{L}+)\s+(\d{4})$/u); // 3. veebruar 2025, 3. veebruaril 2025
  if (m) {
    const kuu = KUUD.findIndex((k) => m[2].toLowerCase().startsWith(k));
    if (kuu >= 0) return `${m[3]}-${kaks(kuu + 1)}-${kaks(m[1])}`;
  }
  return s;
}

export const SAMMUD = {
  trim: (s) => s.trim(),
  vaiketahed: (s) => s.toLowerCase(),
  eemalda_lopupunkt: (s) => s.replace(/[.!?]$/u, ''),
  eemalda_koodiplokk: (s) => s.replace(/^\s*```[^\n]*\n?/u, '').replace(/\n?```\s*$/u, ''),
  eemalda_eessona: (s) => s.replace(/^(?:vastus\s+on\s*:?|vastus\s*:|see\s+on)\s*/iu, ''),
  kuupaev_iso: kuupaevIso,
  arv_punkt: (s) => s.replace(/(\d)[\s  ](?=\d{3}(?!\d))/gu, '$1').replace(/(\d),(\d)/gu, '$1.$2'),
};

export function normaliseeri(tekst, sammud) {
  return sammud.reduce((s, nimi) => {
    const f = SAMMUD[nimi];
    if (!f) throw new Error(`Tundmatu normaliseerimine: ${nimi}`);
    return f(s);
  }, tekst);
}
