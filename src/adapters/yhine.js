// Adapterite ühine osa: veaklass ja aja mõõtmine.
//
// Iga adapter tagastab funktsiooni saada(sonum), mis annab tulemuse kujul
//   { text, modelVersion, finishReason, usage, usageRaw, ttftMs, totalMs }
//   usage = { input, cachedInput, output, reasoning }
//     input       kogu sisend tokenites (k.a vahemälust loetud osa)
//     cachedInput vahemälust loetud sisend; null, kui pakkuja seda ei tagasta
//     output      kogu väljund tokenites (k.a mõtlemistokenid)
//     reasoning   mõtlemistokenid; null, kui pakkuja neid eraldi ei tagasta
//   usageRaw = pakkuja usage-objekt muutmata kujul
//   ttftMs  = aeg päringu algusest esimese mittetühja vastuseteksti tükini
//             (mõtlemist ei arvestata); null, kui vastuses teksti polnud
//   totalMs = aeg päringu algusest striimi lõpuni
// API viga visatakse ApiViga-na. Keeldumine, tühi või katkenud vastus on tavaline tulemus.

export const kell = () => performance.now();

export class ApiViga extends Error {
  constructor(teade, { status = null, korratav = false, pohjus } = {}) {
    super(teade, pohjus ? { cause: pohjus } : undefined);
    this.name = 'ApiViga';
    this.status = status;
    // Faas 2 kordab ainult korratavaid vigu: 429, 5xx, ajalõpp ja katkenud ühendus [PK1].
    this.korratav = korratav;
  }
}

export function onKorratavStaatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

// SDK vea teisendamine. onApiViga(e) ütleb, kas viga tuli API-st või võrgust.
// Staatuseta API viga (ajalõpp, katkenud ühendus või striim) loetakse korratavaks.
// Muu viga (nt programmeerimisviga) visatakse edasi muutmata, et see ei peituks API vea taha.
export function teisendaViga(e, onApiViga) {
  if (e instanceof ApiViga) return e;
  if (!onApiViga(e)) return e;
  const status = typeof e.status === 'number' ? e.status : null;
  const korratav = status === null ? true : onKorratavStaatus(status);
  return new ApiViga(String(e.message ?? e), { status, korratav, pohjus: e });
}

// Võti puudub → kohe viga, mitte vaikne üleminek SDK teistele autentimisviisidele.
export function apiVoti(mudel, env) {
  const nimi = mudel.apiKeyEnv;
  const voti = nimi ? env[nimi] : undefined;
  if (!voti) throw new Error(`${mudel.id}: API-võti ${nimi} puudub failis .env (vt .env.example)`);
  return voti;
}

export const taisarv = (v) => (typeof v === 'number' ? v : null);
