// Доходность всех опубликованных вилл и апартаментов тем же расчётом, что и
// страница объекта (buildSnapshot + computeYieldFacts), — в listing_yields
// (миграция 116). Каталог, подборки на главной и консультант читают её
// оттуда (lib/investment/batch-scores.ts), чтобы цифры везде совпадали.
//
//   npx tsx --env-file=.env.local scripts/build-listing-yields.ts
import { createClient } from '@supabase/supabase-js'
import { buildSnapshot, type ListingKind } from '../lib/investment/snapshot'
import { computeYieldFacts, yieldScenarios } from '../lib/listing-verdict'
import { computeChance, type ViewKind } from '../lib/investment/chance'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const PARALLEL = 8

// Поля для вероятности (lib/investment/chance.ts): разрешение, цвет земли,
// комплекс. У апартаментов земли и часто разрешения нет — берём у комплекса.
// Юнит связан с комплексом его названием в «Комплекс 1» (миграция 112, как
// lib/complex-units.ts), а не ссылкой «Комплекс».
type Facts = { id: string; permit: string | null; land: string | null; complex: string | null }
const first = (v: unknown): string | null => {
  if (Array.isArray(v)) return first(v[0])
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

async function published(table: string): Promise<Facts[]> {
  const out: Facts[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table)
      .select('airtable_id, permit:data->"Разрешение", land:data->"Land color", complex:data->"Комплекс 1"')
      .eq('data->>Опубликовать', 'true').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []).map(r => ({ id: String(r.airtable_id), permit: first(r.permit), land: first(r.land), complex: first(r.complex) })))
    if (!data || data.length < 1000) return out
  }
}

type ComplexFacts = { id: string; permit: string | null; land: string | null }
const cxKey = (name: string) => name.trim().toLowerCase()

async function complexFacts(): Promise<Map<string, ComplexFacts>> {
  const out = new Map<string, ComplexFacts>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('raw_complexes')
      .select('airtable_id, name:data->Project, permit:data->"Разрешительные документы", land:data->"Land color"').range(from, from + 999)
    if (error) throw new Error(`raw_complexes: ${error.message}`)
    for (const r of data ?? []) {
      const name = first(r.name)
      if (name) out.set(cxKey(name), { id: String(r.airtable_id), permit: first(r.permit), land: first(r.land) })
    }
    if (!data || data.length < 1000) return out
  }
}

async function views(): Promise<Map<string, ViewKind>> {
  const { data, error } = await sb.from('listing_views').select('kind, airtable_id, view').limit(10000)
  if (error) throw new Error(`listing_views: ${error.message}`)
  return new Map((data ?? []).map(r => [`${r.kind}:${r.airtable_id}`, r.view as ViewKind]))
}

// «нет» в поле разрешения — значение по умолчанию, а не ответ застройщика.
const realPermit = (v: string | null) => (v && v.toLowerCase() !== 'нет' ? v : null)

async function main() {
  const [villas, apts, cx, viewOf] = await Promise.all([published('raw_villas'), published('raw_apartments'), complexFacts(), views()])
  const units: ({ kind: ListingKind } & Facts)[] = [
    ...villas.map(f => ({ kind: 'villa' as const, ...f })),
    ...apts.map(f => ({ kind: 'apartment' as const, ...f })),
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
        const range = yieldScenarios(snap, null)[y.mode]
        const c = u.complex ? cx.get(cxKey(u.complex)) : undefined
        const { chance, factors } = computeChance({
          snap,
          permit: realPermit(u.permit) ?? realPermit(c?.permit ?? null),
          landColor: u.land ?? c?.land ?? null,
          view: viewOf.get(`${u.kind}:${u.id}`) ?? null,
        })
        const occSource = y.mode === 'monthly' ? null
          : snap.ownBooking?.occupancy != null ? snap.ownBooking.source
          : snap.marketOccupancy ? 'market' : 'default'
        rows.push({
          kind: u.kind, airtable_id: u.id, mode: y.mode,
          cap_before: y.pct.beforeTax, cap_resident: y.pct.resident, cap_nonres: y.pct.nonResident,
          rate_usd: Math.round(y.rateUsd),
          occupancy: y.mode === 'daily' ? (snap.ownBooking?.occupancy ?? snap.region.occupancyByScenario.median) : null,
          occ_source: occSource, computed_at: new Date().toISOString(),
          // Вилка всегда охватывает середину: у комплекса со своей загрузкой
          // плохой год из сценария соседей может оказаться выше неё.
          cap_low: range ? Math.min(range.bad, y.pct.beforeTax) : null,
          cap_high: range ? Math.max(range.good, y.pct.beforeTax) : null,
          chance, factors, complex_id: c?.id ?? null,
          entry_usd: y.entryUsd != null ? Math.round(y.entryUsd) : null,
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
