// What is actually around a listing, computed from our own Bali places dataset
// (migrations 049/054, table listing_surroundings). Covers 1064 listings —
// villas, apartments and complexes — against 775 in the older paid manifest
// behind lib/nearby-places.ts, and refreshing it costs nothing.
//
// Read-by-id where null is a legitimate answer, so no cache wrapper — same
// discipline as lib/complex-access.ts.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

/** One nearby venue, already filtered down to the well-reviewed ones. */
export type NearbyVenue = {
  id: string
  name: string | null
  bucket: string
  type: string | null
  rating: number | null
  reviews: number | null
  dist_m: number | null
  photo_url?: string | null
  photo_attr?: string | null
  /** From the two-sweep review-language test: who actually goes there. */
  tourist_grade?: 'tourist_only' | 'tourist_mostly' | 'mixed' | 'local' | null
}

export type Surroundings = {
  /** Counts of good venues by bucket, within 1 / 3 / 5 km. */
  r1: Record<string, number>
  r3: Record<string, number>
  r5: Record<string, number>
  /** Share of small venues nearby that are foreigner-facing, 0-100. */
  touristShare: number | null
  top: NearbyVenue[]
}

export async function loadSurroundings(
  kind: 'complex' | 'villa' | 'apartment',
  airtableId: string,
): Promise<Surroundings | null> {
  const { data, error } = await sb
    .from('listing_surroundings')
    .select('data')
    .eq('kind', kind)
    .eq('airtable_id', airtableId)
    .maybeSingle()
  if (error || !data?.data) return null

  const d = data.data as {
    r1?: Record<string, number>
    r3?: Record<string, number>
    r5?: Record<string, number>
    tourist_env?: { share?: number | null }
    top?: NearbyVenue[]
  }

  const top = (d.top ?? []).filter((v) => v.name)
  if (!top.length && !d.r3) return null

  return {
    r1: d.r1 ?? {},
    r3: d.r3 ?? {},
    r5: d.r5 ?? {},
    touristShare: d.tourist_env?.share ?? null,
    top,
  }
}
