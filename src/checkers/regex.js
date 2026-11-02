// Building the pattern of the regex_present and regex_absent rules.
// whole_word: Unicode word boundary, because JS \b does not treat accented letters (õ, ä, ö, ü) as letters.

export function buildRegex(rule) {
  const flags = rule.flags ?? '';
  if (rule.whole_word) {
    const withUnicode = flags.includes('u') ? flags : flags + 'u';
    return new RegExp(`(?<![\\p{L}\\p{N}])(?:${rule.value})(?![\\p{L}\\p{N}])`, withUnicode);
  }
  return new RegExp(rule.value, flags);
}
