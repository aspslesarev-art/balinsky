// «Для жизни» для всех опубликованных вилл и апартаментов тем же расчётом,
// что и страница объекта (lib/living.ts), — в listing_living (миграция 120).
// Каталог по ней сортирует фильтр «Для жизни» и пишет на карточке расстояния.
// Запускать после обновления мест вокруг (scripts/sync-nearby-places.mjs).
//
//   npx tsx --env-file=.env.local scripts/build-listing-living.ts
import { createClient } from '@supabase/supabase-js'
import { computeLivingFacts, livingSummary } from '../lib/living'
import { computeGeoNoise, indexRoads, type OsmNoise } from '../lib/living-geo'
import type { Climate } from '../lib/complex-access'
import type { NearbyPlace } from '../lib/nearby-places'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/competitors`
const PARALLEL = 8

type Pub = { id: string; lat: number | null; lng: number | null }
const num = (v: unknown): number | null => { const x = Number(Array.isArray(v) ? v[0] : v); return Number.isFinite(x) && x !== 0 ? x : null }

async function published(table: string): Promise<Pub[]> {
  const out: Pub[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('airtable_id, lat:data->Geo, lng:data->"Geo 2"').eq('data->>Опубликовать', 'true').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []).map(r => ({ id: String(r.airtable_id), lat: num(r.lat), lng: num(r.lng) })))
    if (!data || data.length < 1000) return out
  }
}

async function geoFacts(): Promise<Map<string, { climate: Climate | null; ispu: number | null; elevation: number | null }>> {
  const out = new Map<string, { climate: Climate | null; ispu: number | null; elevation: number | null }>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('listing_geo_facts').select('kind, airtable_id, climate, air, elevation_m').range(from, from + 999)
    if (error) throw new Error(`listing_geo_facts: ${error.message}`)
    for (const r of data ?? []) out.set(`${r.kind}:${r.airtable_id}`, {
      climate: (r.climate as Climate | null) ?? null,
      ispu: (r.air as { ispu_avg?: number } | null)?.ispu_avg ?? null,
      elevation: r.elevation_m != null ? Number(r.elevation_m) : null,
    })
    if (!data || data.length < 1000) return out
  }
}

async function main() {
  const idx = await fetch(`${BASE}/_nearby_places.json`).then(r => (r.ok ? r.json() : null)) as { ids: string[] } | null
  if (!idx?.ids?.length) throw new Error('nearby index unavailable')
  const has = new Set(idx.ids)
  const osm = await fetch(`${BASE}/_osm_noise.json`).then(r => (r.ok ? r.json() : null)) as OsmNoise | null
  if (!osm?.roads?.length) throw new Error('osm noise file unavailable (node scripts/osm-noise.mjs)')
  const roadCells = indexRoads(osm)
  const geo = await geoFacts()
  const units = [
    ...(await published('raw_villas')).map(p => ({ kind: 'villa' as const, ...p })),
    ...(await published('raw_apartments')).map(p => ({ kind: 'apartment' as const, ...p })),
  ].filter(u => has.has(u.id))

  const rows: Record<string, unknown>[] = []
  let failed = 0
  const queue = [...units]
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      try {
        const r = await fetch(`${BASE}/_nearby_places/${u.id}.json`)
        if (!r.ok) continue
        const byCategory = (await r.json()) as Record<string, NearbyPlace[]>
        const noise = u.lat != null && u.lng != null ? computeGeoNoise(u.lat, u.lng, osm, roadCells) : null
        const g = geo.get(`${u.kind}:${u.id}`)
        const f = computeLivingFacts({ byCategory, routes: null, leaseYears: null, bedrooms: null, noise, climate: g?.climate ?? null, ispu: g?.ispu ?? null, elevationM: g?.elevation ?? null })
        if (!f) continue
        rows.push({ kind: u.kind, airtable_id: u.id, ...livingSummary(f), ...(noise ?? {}), computed_at: new Date().toISOString() })
      } catch (e) {
        failed++
        console.error(u.kind, u.id, String(e).slice(0, 160))
      }
    }
  }))
  // Пустой итог при сотнях объектов — сбой, а не правда: старые цифры не трогаем.
  if (rows.length < units.length / 2) throw new Error(`only ${rows.length} of ${units.length} computed, not writing`)
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from('listing_living').upsert(rows.slice(i, i + 500))
    if (error) throw new Error(`upsert: ${error.message}`)
  }
  const keep = new Set(rows.map(r => `${r.kind}:${r.airtable_id}`))
  const { data: old } = await sb.from('listing_living').select('kind, airtable_id')
  const gone = (old ?? []).filter(r => !keep.has(`${r.kind}:${r.airtable_id}`))
  for (const g of gone) await sb.from('listing_living').delete().eq('kind', g.kind).eq('airtable_id', g.airtable_id)
  const tones = rows.reduce<Record<string, number>>((a, r) => { a[String(r.tone)] = (a[String(r.tone)] ?? 0) + 1; return a }, {})
  console.log(`listing_living: ${rows.length} written of ${units.length} with places, ${gone.length} removed, ${failed} failed`, tones)
}

main().catch(e => { console.error(e); process.exit(1) })
