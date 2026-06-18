// Bali zoning labels saved in Airtable's "Назначение земли" field. The
// strings vary — sometimes a colour ("красная"), sometimes a function
// ("туристическая зона"), sometimes Indonesian ("Pariwisata"). We
// classify them into three buckets so the comparison surface can warn
// the visitor when a saved listing sits on land that isn't legally
// short-term rentable.
//
// Pariwisata / red / tourism / commercial = daily rental OK.
// Residensial / yellow / pink / жилая / hijau = daily rental NOT
// permitted (or, for hijau / agricultural, building itself is
// suspect).
// Anything we don't recognise stays "unknown" — better silent than a
// false positive that scares people away from a legitimate listing.

export type LandRentalStatus = 'allowed' | 'restricted' | 'unknown'

export function classifyLandUse(landUse: string | null | undefined): LandRentalStatus {
  if (!landUse) return 'unknown'
  const s = landUse.toLowerCase()
  if (/(туристич|tourism|комм[еэ]рч|commercial|pariwisata|merah|красн)/.test(s)) return 'allowed'
  if (/(жил|residensial|residential|pemukiman|permukiman|kuning|жёлт|желт|розов|pink|yellow|hijau|зелён|зелен)/.test(s)) return 'restricted'
  return 'unknown'
}

// Bucket for the structured Airtable "Land color" field (distinct from the
// free-text "Назначение земли" above). Yellow = residential zoning: legal to
// live in, but short-term / daily tourist rental is NOT permitted — so any
// daily-rental yield is meaningless there. Pink / Orange / Tourism / C1–C2 /
// Commercial = tourism zoning where daily rental is allowed. Empty or
// unrecognised stays 'unknown' so a missing field never wrongly restricts a
// listing. Mirrors the catalog's own `landBucket` and is shared by the
// investment batch-scores and the per-listing investment snapshot.
export type LandColorBucket = 'residential' | 'tourism' | 'unknown'

export function landColorBucket(landColor: string | null | undefined): LandColorBucket {
  if (!landColor) return 'unknown'
  const s = landColor.toLowerCase()
  if (s.includes('yellow')) return 'residential'
  if (s.includes('pink') || s.includes('tourism') || s.includes('orange')
    || /\bc-?\d\b/.test(s) || s.includes('commercial')) return 'tourism'
  return 'unknown'
}

// True when daily/short-term rental is illegal on this listing's land, so
// computing or showing a daily-rental yield is wrong. Conservative: only the
// explicitly-yellow (residential) bucket counts — 'unknown' does not.
export function isDailyRentalRestricted(landColor: string | null | undefined): boolean {
  return landColorBucket(landColor) === 'residential'
}
