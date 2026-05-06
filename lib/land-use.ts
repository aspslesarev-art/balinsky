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
