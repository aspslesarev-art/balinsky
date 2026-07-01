// Bali administrative geo hierarchy: local area (district) → kecamatan
// (sub-district) → kabupaten (regency) → island. Google flagged
// "Missing: badung regency" in our snippets because listings named only the
// local area (Kutuh / Bukit / Uluwatu) and never the regency. This map
// restores the full chain for titles, H1s, the visible "Расположение"
// section and BreadcrumbList (TASK-13d/13e).
//
// Keys are lowercased district names as they appear in Location / Location 2.
// Regency assignment follows the TASK-13 geo map; a few districts that the
// task listed loosely (Cemagi, Sanur) use their actual kabupaten and are
// flagged in comments — publishing a wrong regency would hurt more than help.

export type Regency =
  | 'Badung'
  | 'Gianyar'
  | 'Tabanan'
  | 'Karangasem'
  | 'Buleleng'
  | 'Klungkung'
  | 'Denpasar'

type GeoEntry = { regency: Regency; kecamatan?: string }

const DISTRICT_GEO: Record<string, GeoEntry> = {
  // ---- Badung Regency ----
  kuta: { regency: 'Badung', kecamatan: 'Kuta' },
  legian: { regency: 'Badung', kecamatan: 'Kuta' },
  seminyak: { regency: 'Badung', kecamatan: 'Kuta' },
  kerobokan: { regency: 'Badung', kecamatan: 'North Kuta' },
  canggu: { regency: 'Badung', kecamatan: 'North Kuta' },
  berawa: { regency: 'Badung', kecamatan: 'North Kuta' },
  'batu bolong': { regency: 'Badung', kecamatan: 'North Kuta' },
  'batu belig': { regency: 'Badung', kecamatan: 'North Kuta' },
  umalas: { regency: 'Badung', kecamatan: 'North Kuta' },
  babakan: { regency: 'Badung', kecamatan: 'North Kuta' },
  padonan: { regency: 'Badung', kecamatan: 'North Kuta' },
  pererenan: { regency: 'Badung', kecamatan: 'Mengwi' },
  'tumbak bayuh': { regency: 'Badung', kecamatan: 'Mengwi' },
  mengwi: { regency: 'Badung', kecamatan: 'Mengwi' },
  seseh: { regency: 'Badung', kecamatan: 'Mengwi' },
  cemagi: { regency: 'Badung', kecamatan: 'Mengwi' }, // task listed under Tabanan; actually Badung/Mengwi
  jimbaran: { regency: 'Badung', kecamatan: 'South Kuta' },
  uluwatu: { regency: 'Badung', kecamatan: 'South Kuta' },
  bukit: { regency: 'Badung', kecamatan: 'South Kuta' },
  kutuh: { regency: 'Badung', kecamatan: 'South Kuta' },
  ungasan: { regency: 'Badung', kecamatan: 'South Kuta' },
  'nusa dua': { regency: 'Badung', kecamatan: 'South Kuta' },
  pandawa: { regency: 'Badung', kecamatan: 'South Kuta' },
  melasti: { regency: 'Badung', kecamatan: 'South Kuta' },
  balangan: { regency: 'Badung', kecamatan: 'South Kuta' },
  bingin: { regency: 'Badung', kecamatan: 'South Kuta' },
  nunggalan: { regency: 'Badung', kecamatan: 'South Kuta' },
  gwk: { regency: 'Badung', kecamatan: 'South Kuta' },
  // ---- Gianyar Regency ----
  ubud: { regency: 'Gianyar', kecamatan: 'Ubud' },
  penestanan: { regency: 'Gianyar', kecamatan: 'Ubud' },
  sukawati: { regency: 'Gianyar', kecamatan: 'Sukawati' },
  // ---- Denpasar (task listed Sanur under Gianyar; it is Denpasar city) ----
  sanur: { regency: 'Denpasar', kecamatan: 'South Denpasar' },
  // ---- Tabanan Regency ----
  tabanan: { regency: 'Tabanan' },
  nyanyi: { regency: 'Tabanan', kecamatan: 'Kediri' },
  kedungu: { regency: 'Tabanan', kecamatan: 'Kediri' },
  'tanah lot': { regency: 'Tabanan', kecamatan: 'Kediri' },
  soka: { regency: 'Tabanan', kecamatan: 'Selemadeg' },
  nuanu: { regency: 'Tabanan', kecamatan: 'Kediri' },
  // ---- Karangasem Regency ----
  amed: { regency: 'Karangasem' },
  candidasa: { regency: 'Karangasem' },
  karangasem: { regency: 'Karangasem' },
  karanggasem: { regency: 'Karangasem' },
  // ---- Buleleng Regency ----
  lovina: { regency: 'Buleleng' },
  singaraja: { regency: 'Buleleng' },
  // ---- Klungkung Regency ----
  'nusa penida': { regency: 'Klungkung' },
  'nusa-penida': { regency: 'Klungkung' },
}

function normDistrict(district: string | null | undefined): string {
  return (district ?? '').toString().trim().toLowerCase().replace(/-/g, ' ')
}

/** The regency ("Badung", …) for a district, or null if unknown. */
export function regencyOf(district: string | null | undefined): Regency | null {
  return DISTRICT_GEO[normDistrict(district)]?.regency ?? null
}

/** "Badung Regency" — the SEO term Google reported missing. */
export function regencyLabel(district: string | null | undefined): string | null {
  const r = regencyOf(district)
  return r ? `${r} Regency` : null
}

/**
 * Full geo chain for a district, most-local first, e.g.
 * geoChain('Kutuh') → ['Kutuh', 'South Kuta', 'Badung Regency', 'Bali'].
 * The passed district keeps its original casing as the local level. Returns
 * just ['<district>', 'Bali'] when the regency is unknown (never fabricates).
 */
export function geoChain(district: string | null | undefined): string[] {
  const area = (district ?? '').toString().trim()
  const entry = DISTRICT_GEO[normDistrict(district)]
  if (!entry) return area ? [area, 'Bali'] : ['Bali']
  const chain: string[] = area ? [area] : []
  if (entry.kecamatan && entry.kecamatan.toLowerCase() !== area.toLowerCase()) {
    chain.push(entry.kecamatan)
  }
  chain.push(`${entry.regency} Regency`, 'Bali')
  return chain
}

/** "Kutuh, South Kuta, Badung Regency, Bali" — for the location section. */
export function geoChainString(district: string | null | undefined): string {
  return geoChain(district).join(', ')
}
