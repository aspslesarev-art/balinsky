// Server-side loader for the cached land-profile per villa
// (populated by scripts/sync_villa_land_profile.py).
//
// Returns null when no row exists yet — caller renders nothing.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type LandProfile = {
  airtable_id: string
  lat: number
  lon: number
  kabupaten: string | null
  kecamatan: string | null
  desa: string | null
  zona_name: string | null
  zona_code: string | null
  subzona_name: string | null
  subzona_code: string | null
  kdb_percent: number | null
  klb_ratio: number | null
  kdh_percent: number | null
  ktb_percent: number | null
  gsb_setback: string | null
  building_height: string | null
  allowed_use_count: number | null
  regulation: string | null
  regulation_pdf: string | null
  str_likely_allowed: string | null
  error: string | null
  synced_at: string
}

export async function loadVillaLandProfile(airtable_id: string): Promise<LandProfile | null> {
  const { data, error } = await sb
    .from('villa_land_profile')
    .select('*')
    .eq('airtable_id', airtable_id)
    .maybeSingle()
  if (error || !data) return null
  return data as LandProfile
}
