// Loader for the cached estatemarket.io aggregates per complex
// (populated by scripts/estatemarket_occupancy.py). Returns null when
// no row exists — caller renders nothing.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type ComplexMarketStats = {
  airtable_id: string
  lat: number
  lon: number
  total_listings_500m: number
  villa_count: number
  villa_occupancy_pct: number | null
  villa_adr_usd: number | null
  villa_revpar_usd: number | null
  apartment_count: number
  apartment_occupancy_pct: number | null
  apartment_adr_usd: number | null
  apartment_revpar_usd: number | null
  synced_at: string
}

export async function loadComplexMarketStats(airtable_id: string): Promise<ComplexMarketStats | null> {
  return loadMarketStats('complex', airtable_id)
}

const TABLE_BY_KIND: Record<'villa' | 'apartment' | 'complex', string> = {
  villa:     'villa_market_stats',
  apartment: 'apartment_market_stats',
  complex:   'complex_market_stats',
}

export async function loadMarketStats(
  kind: 'villa' | 'apartment' | 'complex',
  airtable_id: string,
): Promise<ComplexMarketStats | null> {
  const { data, error } = await sb
    .from(TABLE_BY_KIND[kind])
    .select('*')
    .eq('airtable_id', airtable_id)
    .maybeSingle()
  if (error || !data) return null
  return data as ComplexMarketStats
}
