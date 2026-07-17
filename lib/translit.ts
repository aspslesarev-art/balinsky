// Cyrillic → Latin transliteration. Handles common Russian-keyboard
// renderings of Bali property names ("убуд" → "ubud", "магнум" → "magnum").
// Lossy/practical (not GOST-strict): enough for fuzzy search to bridge.

const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e',
  ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function translit(s: string): string {
  if (!s) return ''
  let out = ''
  for (const ch of s.toLowerCase()) {
    out += MAP[ch] ?? ch
  }
  return out
}

export function hasCyrillic(s: string): boolean {
  return /[а-яёА-ЯЁ]/.test(s)
}

// Case- and Latin-preserving transliteration: only Cyrillic characters are
// mapped, everything else (Latin, digits, punctuation, case) is kept as-is.
// "LAGUNA (Комплекс 7)" → "LAGUNA (Kompleks 7)". Used as a last-resort
// de-Cyrillic fallback for non-RU pages when no translation exists.
export function translitPreserveCase(s: string): string {
  if (!s) return ''
  let out = ''
  for (const ch of s) {
    const lower = ch.toLowerCase()
    const mapped = MAP[lower]
    if (mapped === undefined) { out += ch; continue }
    out += ch === lower || !mapped ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1)
  }
  return out
}
