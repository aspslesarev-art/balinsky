// Per-complex access/logistics: traffic-aware drive times to key Bali hubs
// and straight-line nearest beach, keyed by complex_id = raw_complexes.airtable_id.
// Populated by scripts/collect-complex-access.mjs.
//
// Read-by-id loader where null is a legitimate "not found" (caller renders
// nothing), so this is deliberately NOT wrapped in safeCachedTable/unstable_cache
// — see CLAUDE.md "Caching & egress" and lib/safe-cached-table.ts.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type ComplexAccess = {
  complex_id: string
  name: string | null
  lat: number | null
  lng: number | null
  drive_airport_min: number | null
  drive_canggu_min: number | null
  drive_seminyak_min: number | null
  drive_ubud_min: number | null
  drive_uluwatu_min: number | null
  dist_airport_km: number | null
  dist_canggu_km: number | null
  nearest_beach_name: string | null
  nearest_beach_km: number | null
  measured_at: string | null
  data: Record<string, unknown> | null
}

// Altitude from listing_geo_facts (Google Elevation, migration 055 and
// scripts/build-listing-routes.mjs). A separate table because it covers villas
// and apartments too, not just complexes. Same read-by-id discipline as below:
// null is a legitimate answer, so no cache wrapper.
export async function loadElevation(
  kind: 'complex' | 'villa' | 'apartment',
  airtableId: string,
): Promise<number | null> {
  const { data, error } = await sb
    .from('listing_geo_facts')
    .select('elevation_m')
    .eq('kind', kind)
    .eq('airtable_id', airtableId)
    .maybeSingle()
  if (error || data?.elevation_m == null) return null
  return Number(data.elevation_m)
}

export async function loadComplexAccess(complexId: string): Promise<ComplexAccess | null> {
  const { data, error } = await sb
    .from('complex_access')
    .select('*')
    .eq('complex_id', complexId)
    .maybeSingle()
  if (error || !data) return null
  return data as ComplexAccess
}
