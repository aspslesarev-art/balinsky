// Доходность всех опубликованных вилл и апартаментов тем же расчётом, что и
// страница объекта (buildSnapshot + computeYieldFacts), — в listing_yields
// (миграция 116). Каталог, подборки на главной и консультант читают её
// оттуда (lib/investment/batch-scores.ts), чтобы цифры везде совпадали.
//
//   npx tsx --env-file=.env.local scripts/build-listing-yields.ts
import { createClient } from '@supabase/supabase-js'
import { buildSnapshot, type ListingKind } from '../lib/investment/snapshot'
import { computeYieldFacts } from '../lib/listing-verdict'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
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
  const units: { kind: ListingKind; id: string }[] = [
    ...(await published('raw_villas')).map(id => ({ kind: 'villa' as const, id })),
    ...(await published('raw_apartments')).map(id => ({ kind: 'apartment' as const, id })),
  ]
  const rows: Record<string, unknown>[] = []
  let failed = 0
  const queue = [...units]
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      try {
        const snap = await buildSnapshot(u.id, u.kind)
        const y = computeYieldFacts(snap)
        if (!snap || !y) continue
        const occSource = y.mode === 'monthly' ? null
          : snap.ownBooking?.occupancy != null ? snap.ownBooking.source
          : snap.marketOccupancy ? 'market' : 'default'
        rows.push({
          kind: u.kind, airtable_id: u.id, mode: y.mode,
          cap_before: y.pct.beforeTax, cap_resident: y.pct.resident, cap_nonres: y.pct.nonResident,
          rate_usd: Math.round(y.rateUsd),
          occupancy: y.mode === 'daily' ? (snap.ownBooking?.occupancy ?? snap.region.occupancyByScenario.median) : null,
          occ_source: occSource, computed_at: new Date().toISOString(),
        })
      } catch (e) {
        failed++
        console.error(u.kind, u.id, String(e).slice(0, 160))
      }
    }
  }))
  // Пустой итог при сотнях объектов — сбой, а не правда: старые цифры не трогаем.
  if (rows.length < units.length / 2) throw new Error(`only ${rows.length} of ${units.length} computed, not writing`)
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from('listing_yields').upsert(rows.slice(i, i + 500))
    if (error) throw new Error(`upsert: ${error.message}`)
  }
  // Снятые с публикации — убрать, чтобы каталог не тянул их старые цифры.
  const keep = new Set(rows.map(r => `${r.kind}:${r.airtable_id}`))
  const { data: old } = await sb.from('listing_yields').select('kind, airtable_id')
  const gone = (old ?? []).filter(r => !keep.has(`${r.kind}:${r.airtable_id}`))
  for (const g of gone) await sb.from('listing_yields').delete().eq('kind', g.kind).eq('airtable_id', g.airtable_id)
  console.log(`listing_yields: ${rows.length} written, ${gone.length} removed, ${failed} failed, ${units.length - rows.length - failed} without yield`)
}

main().catch(e => { console.error(e); process.exit(1) })
