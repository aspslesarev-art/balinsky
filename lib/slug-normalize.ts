// Canonical slug normalisation. Airtable lets editors paste anything
// into SEO:Slug — over time we accumulated cyrillic-look-alikes (the
// `с` (U+0441) instead of `c` (U+0063) bug), parentheses, repeated
// dashes, mixed case. GSC then crawls those URLs, and either gets a
// 5xx (some downstream code can't cope with the spec chars) or a
// 404 because something further upstream re-encodes them subtly.
//
// One canonical form fixes the lot:
//   - ASCII-fold any Cyrillic visually-equivalent to a Latin letter
//   - Lowercase everything
//   - Strip every non-[a-z0-9-] character (parens, slashes, etc.)
//   - Collapse repeated dashes, trim trailing/leading
//
// Result: a slug that round-trips through every URL encoder / parser
// without surprises and survives the GSC ↔ Vercel ↔ Supabase chain.

// Cyrillic letters that Airtable editors regularly paste thinking
// they're Latin. Maps each to its closest Latin equivalent.
// Keep this list narrow on purpose — we don't want to transliterate
// real Russian (`корова` shouldn't become `korova`) and accidentally
// merge two distinct slugs. We only want look-alikes.
const CYRILLIC_LATIN_LOOKALIKES: Record<string, string> = {
  'а': 'a', 'А': 'a',
  'е': 'e', 'Е': 'e',
  'о': 'o', 'О': 'o',
  'р': 'p', 'Р': 'p',
  'с': 'c', 'С': 'c',
  'у': 'y', 'У': 'y',
  'х': 'x', 'Х': 'x',
  'к': 'k', 'К': 'k',
  'м': 'm', 'М': 'm',
  'т': 't', 'Т': 't',
  'в': 'b', 'В': 'b',
  'н': 'h', 'Н': 'h',
  'і': 'i', 'І': 'i',
  'ё': 'e', 'Ё': 'e',
}

// Full Russian transliteration for slugs that *intentionally* contain
// Russian words (project names like "Комплекс 6"). This kicks in only
// after the look-alike fold above, so a cluster of letters we know
// is real Russian gets a clean ASCII slug instead of being stripped.
const RU_TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shh', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

// Cyrillic letters that have NO visual Latin twin in the look-alike
// table. Their presence in a slug means the source is real Russian
// text (e.g. `переренан`, `комплекс`) — and the look-alike pass would
// mangle it (`н` → `h` is visual but phonetically wrong). When any of
// these appears, skip look-alikes and go straight to transliteration.
const DEFINITELY_RUSSIAN_RE = /[бгджзийлпфцчшщъыьэюя]/i

export function normalizeSlug(raw: string | null | undefined): string {
  if (!raw) return ''
  const lowered = raw.toLowerCase()
  // 1. Branch on text type. A slug that contains a clearly-Russian
  //    letter goes straight to phonetic transliteration; a slug with
  //    only look-alike-compatible cyrillic (or none) gets the visual
  //    fold so `сanggu` → `canggu` instead of `sanggu`.
  let folded: string
  if (DEFINITELY_RUSSIAN_RE.test(lowered)) {
    folded = ''
    for (const ch of lowered) folded += RU_TRANSLIT[ch] ?? ch
  } else {
    folded = ''
    for (const ch of lowered) folded += CYRILLIC_LATIN_LOOKALIKES[ch]?.toLowerCase() ?? ch
  }
  // 2. Strip everything that isn't a-z0-9 or dash. Collapse runs of
  //    dashes. Trim. Empty strings stay empty (caller decides whether
  //    that's a 404 or a fallback).
  return folded
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// True when `raw` is already the canonical form of itself. Used by
// detail pages to decide whether to render or redirect.
export function isCanonicalSlug(raw: string | null | undefined): boolean {
  return !!raw && normalizeSlug(raw) === raw
}
