// Schematic massing of a complex (scripts/kb-massing.mjs →
// complex-photos/_massing.json): how many structures, how tall, roof shape,
// pool and parking — enough to extrude simple blocks and cast a real sun.
//
// Mirrors lib/listing-copy.ts: same ISR + in-process cache, same never-throw
// policy. Low-confidence entries are filtered out at load time: a massing
// guessed from interior-only photos is worse than showing nothing.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const BUCKET = 'complex-photos'

// Below this the photo set did not actually show the site layout.
const MIN_CONFIDENCE = 0.5

export interface MassingBuilding {
  storeys: number
  footprint_share: number
  roof: 'flat' | 'pitched' | 'thatch' | 'mixed'
  form: 'block' | 'L' | 'U' | 'bar' | 'villa'
}

export interface MassingEntry {
  buildings: MassingBuilding[]
  pool: { present: boolean; position: string | null }
  parking: string
  density: 'low' | 'medium' | 'high'
  site_layout: 'single' | 'row' | 'cluster' | 'courtyard' | 'tower'
  confidence: number
  at: string
}

export type MassingManifest = Record<string, MassingEntry>

let _cache: { ts: number; data: MassingManifest } | null = null
const TTL = 5 * 60 * 1000

export async function loadMassingManifest(): Promise<MassingManifest> {
  if (_cache && Date.now() - _cache.ts < TTL) return _cache.data
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/_massing.json`
    const r = await fetch(url, { next: { revalidate: 3600, tags: ['massing:complex'] } })
    if (!r.ok) return _cache?.data ?? {}
    const data = (await r.json()) as MassingManifest
    _cache = { ts: Date.now(), data }
    return data
  } catch {
    return _cache?.data ?? {}
  }
}

export async function loadComplexMassing(airtableId: string | null | undefined): Promise<MassingEntry | null> {
  if (!airtableId) return null
  const man = await loadMassingManifest()
  const e = man[airtableId]
  if (!e || !Array.isArray(e.buildings) || !e.buildings.length) return null
  return e.confidence >= MIN_CONFIDENCE ? e : null
}

/**
 * Plot side in metres. There are no surveyed plot dimensions anywhere in the
 * data, so this is derived from the unit count purely to give the schematic a
 * believable scale — it must never be presented as the real site area.
 */
export function estimateSiteSize(units: number | null | undefined, buildings: number): number {
  const n = Number(units) || buildings * 4
  return Math.max(45, Math.min(160, Math.round(Math.sqrt(n * 180))))
}
