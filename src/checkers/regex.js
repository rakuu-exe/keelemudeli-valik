// Reeglite regex_olemas ja regex_puudub mustri koostamine.
// terve_sona: Unicode-sõnapiir, sest JS \b ei loe täpitähti tähtedeks.

export function koostaRegex(reegel) {
  const lipud = reegel.lipud ?? '';
  if (reegel.terve_sona) {
    const u = lipud.includes('u') ? lipud : lipud + 'u';
    return new RegExp(`(?<![\\p{L}\\p{N}])(?:${reegel.v})(?![\\p{L}\\p{N}])`, u);
  }
  return new RegExp(reegel.v, lipud);
}
