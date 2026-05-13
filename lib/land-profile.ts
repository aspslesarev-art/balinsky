// Server-side loader for the cached land-profile per villa
// (populated by scripts/sync_villa_land_profile.py).
//
// Returns null when no row exists yet — caller renders nothing.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type TranslationFields = Partial<{
  kabupaten: string
  kecamatan: string
  desa: string
  zona_name: string
  subzona_name: string
  gsb_setback: string
  building_height: string
  regulation: string
}>

export type UseCaseStatus =
  | 'allowed'
  | 'limited'
  | 'conditional'
  | 'limited_conditional'
  | 'forbidden'
  | 'unknown'
  | null

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
  // Expanded fields (migration 028):
  document_perda_url: string | null
  document_body_url: string | null
  document_verification_url: string | null
  uses_hotel: UseCaseStatus
  uses_villa: UseCaseStatus
  uses_kos: UseCaseStatus
  uses_restaurant: UseCaseStatus
  religious_restrictions: string | null
  zone_homogeneity: 'uniform' | 'mixed' | null
  mixed_zones: string | null
  trust_score: number | null
  translations: { ru?: TranslationFields; en?: TranslationFields } | null
  error: string | null
  synced_at: string
}

export type LandProfileKind = 'villa' | 'apartment' | 'complex'

const TABLE_BY_KIND: Record<LandProfileKind, string> = {
  villa: 'villa_land_profile',
  apartment: 'apartment_land_profile',
  complex: 'complex_land_profile',
}

export async function loadLandProfile(
  kind: LandProfileKind,
  airtable_id: string,
): Promise<LandProfile | null> {
  const { data, error } = await sb
    .from(TABLE_BY_KIND[kind])
    .select('*')
    .eq('airtable_id', airtable_id)
    .maybeSingle()
  if (error || !data) return null
  return data as LandProfile
}

// Legacy alias — kept so existing villa detail pages don't churn. Prefer
// `loadLandProfile('villa', id)` in new code.
export async function loadVillaLandProfile(airtable_id: string): Promise<LandProfile | null> {
  return loadLandProfile('villa', airtable_id)
}
