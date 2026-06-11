// Developers whose listings must NOT appear anywhere on the site — full hide,
// not just a TOP-placement suppression (that's lib/top-blacklist.ts). Applied
// as a filter in every catalog loader (villas, apartments, complexes), on the
// developers list + detail, on the homepage, and in the Балина consultant.
// Survives the Airtable→Supabase sync (it's code, not a publish flag), so it
// can't be undone by a re-sync; remove the name here to bring a developer back.
//
// Match is EXACT on the normalized name (not substring) — "unit" is a common
// fragment, so substring matching would wrongly hide a future "United"/"Unity".
const NORMALIZED_HIDDEN = new Set<string>([
  'unit',                  // "UNIT." — /ru/zastrojshhiki/unit-bali-developer
  'unit bali',
  'unit bali developer',
])

function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-zа-я0-9]+/g, ' ').trim()
}

// Airtable carries the developer name in several variants (Developer /
// Developer1 / freeform). Pass everything you can — first match wins.
export function isHiddenDeveloper(...signals: Array<string | null | undefined>): boolean {
  for (const s of signals) {
    const n = normalize(s)
    if (n && NORMALIZED_HIDDEN.has(n)) return true
  }
  return false
}
