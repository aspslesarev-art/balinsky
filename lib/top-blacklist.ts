// Developers / complexes that historically had TOP=true in Airtable but
// should NOT show up in any "top" section on the site (home landing, top-sort
// in catalogs, etc.). They still appear in the regular catalog listing — this
// only suppresses the boosted placement.
const NORMALIZED_BLACKLIST = new Set<string>([
  'bali baza',
  'bali-baza',
  'balibaza',
  'бали база',
  'бали-база',
  'балибаза',
])

function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-zа-я0-9]+/g, ' ').trim()
}

// Some Airtable records carry the developer name in multiple variants
// (Developer / Developer1 / freeform). Pass everything you can — first
// match wins.
export function isTopBlacklisted(...signals: Array<string | null | undefined>): boolean {
  for (const s of signals) {
    const n = normalize(s)
    if (!n) continue
    if (NORMALIZED_BLACKLIST.has(n)) return true
    // substring match — handles "Bali Baza Group", "Бали База / BaliBaza"
    for (const bad of NORMALIZED_BLACKLIST) {
      if (n.includes(bad)) return true
    }
  }
  return false
}
