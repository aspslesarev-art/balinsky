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
