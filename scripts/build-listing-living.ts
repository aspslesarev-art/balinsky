// «Для жизни» для всех опубликованных вилл и апартаментов тем же расчётом,
// что и страница объекта (lib/living.ts), — в listing_living (миграция 120).
// Каталог по ней сортирует фильтр «Для жизни» и пишет на карточке расстояния.
// Запускать после обновления мест вокруг (scripts/sync-nearby-places.mjs).
//
//   npx tsx --env-file=.env.local scripts/build-listing-living.ts
import { createClient } from '@supabase/supabase-js'
import { computeLivingFacts, livingSummary } from '../lib/living'
import type { NearbyPlace } from '../lib/nearby-places'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/competitors`
const PARALLEL = 8

async function published(table: string): Promise<string[]> {
  const out: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('airtable_id').eq('data->>Опубликовать', 'true').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []).map(r => String(r.airtable_id)))
    if (!data || data.length < 1000) return out
  }
}

async function main() {
  const idx = await fetch(`${BASE}/_nearby_places.json`).then(r => (r.ok ? r.json() : null)) as { ids: string[] } | null
  if (!idx?.ids?.length) throw new Error('nearby index unavailable')
  const has = new Set(idx.ids)
  const units = [
    ...(await published('raw_villas')).map(id => ({ kind: 'villa' as const, id })),
    ...(await published('raw_apartments')).map(id => ({ kind: 'apartment' as const, id })),
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
        const f = computeLivingFacts({ byCategory, routes: null, leaseYears: null, bedrooms: null })
        if (!f) continue
        rows.push({ kind: u.kind, airtable_id: u.id, ...livingSummary(f), computed_at: new Date().toISOString() })
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
