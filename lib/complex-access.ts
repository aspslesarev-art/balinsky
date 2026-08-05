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

/** Per-month climate: how many days of each kind an average month has. */
export type ClimateMonth = {
  days: number
  /** Days without a real downpour — on Bali that means a sunny day. */
  sunny: number
  /** Days with >= 5 mm of rain. */
  wet: number
  rain_mm: number | null
  t_max: number | null
  rh: number | null
}
export type Climate = Record<string, ClimateMonth> & {
  year?: { days: number; sunny: number; wet: number; years: number }
}
/** Seconds with traffic, seconds on an empty road, metres. */
export type RouteLeg = { s: number; static_s: number | null; m: number | null }
export type Routes = Partial<Record<'airport' | 'canggu' | 'ubud' | 'uluwatu' | 'sanur', RouteLeg>>

export type GeoFacts = {
  elevation_m: number | null
  sunshine_hours_year: number | null
  climate: Climate | null
  air: { uaqi_avg: number | null; ispu_avg: number | null; dominant: string | null; hours: number } | null
  routes: Routes | null
  routes_peak_at: string | null
}

// Altitude, sunshine, climate and air from listing_geo_facts (migrations 055
// and 056; filled by scripts/build-listing-routes.mjs and
// build-listing-environment.mjs). A separate table from complex_access because
// it covers villas and apartments too. Same read-by-id discipline as below:
// null is a legitimate answer, so no cache wrapper.
export async function loadGeoFacts(
  kind: 'complex' | 'villa' | 'apartment',
  airtableId: string,
): Promise<GeoFacts | null> {
  const { data, error } = await sb
    .from('listing_geo_facts')
    .select('elevation_m,sunshine_hours_year,climate,air,routes_peak,routes_peak_at')
    .eq('kind', kind)
    .eq('airtable_id', airtableId)
    .maybeSingle()
  if (error || !data) return null
  return {
    elevation_m: data.elevation_m != null ? Number(data.elevation_m) : null,
    sunshine_hours_year: data.sunshine_hours_year != null ? Number(data.sunshine_hours_year) : null,
    climate: (data.climate as Climate | null) ?? null,
    air: (data.air as GeoFacts['air']) ?? null,
    // routes_peak carries both readings (with traffic and on a clear road);
    // the plain `routes` column is the same trip measured at an arbitrary hour.
    routes: (data.routes_peak as Routes | null) ?? null,
    routes_peak_at: (data.routes_peak_at as string | null) ?? null,
  }
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
