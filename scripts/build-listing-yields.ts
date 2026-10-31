// Доходность всех опубликованных вилл и апартаментов тем же расчётом, что и
// страница объекта (buildSnapshot + computeYieldFacts), — в listing_yields
// (миграция 116). Каталог, подборки на главной и консультант читают её
// оттуда (lib/investment/batch-scores.ts), чтобы цифры везде совпадали.
//
//   npx tsx --env-file=.env.local scripts/build-listing-yields.ts
import { createClient } from '@supabase/supabase-js'
import { buildSnapshot, type ListingKind } from '../lib/investment/snapshot'
import { computeYieldFacts, yieldScenarios } from '../lib/listing-verdict'
import { computeFactors, neighbourChance, pickSimilar, type Match, type NeighbourPerf, type UnitProfile, type ViewKind } from '../lib/investment/chance'
import type { VisionFeatures, VisionManifest } from '../lib/listing-features'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const PARALLEL = 8

// Поля для вероятности (lib/investment/chance.ts): разрешение, цвет земли,
// комплекс. У апартаментов земли и часто разрешения нет — берём у комплекса.
// Юнит связан с комплексом его названием в «Комплекс 1» (миграция 112, как
// lib/complex-units.ts), а не ссылкой «Комплекс».
type Facts = { id: string; permit: string | null; land: string | null; complex: string | null; pool: string | null }
const first = (v: unknown): string | null => {
  if (Array.isArray(v)) return first(v[0])
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

async function published(table: string): Promise<Facts[]> {
  const out: Facts[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table)
      .select('airtable_id, permit:data->"Разрешение", land:data->"Land color", complex:data->"Комплекс 1", pool:data->"Бассейн", pool_en:data->Pool')
      .eq('data->>Опубликовать', 'true').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []).map(r => ({ id: String(r.airtable_id), permit: first(r.permit), land: first(r.land), complex: first(r.complex), pool: first(r.pool) ?? first(r.pool_en) })))
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

// Вид, поставленный руками (source manual), главнее разбора фото.
async function manualViews(): Promise<Map<string, ViewKind>> {
  const { data, error } = await sb.from('listing_views').select('kind, airtable_id, view').eq('source', 'manual').limit(10000)
  if (error) throw new Error(`listing_views: ${error.message}`)
  return new Map((data ?? []).map(r => [`${r.kind}:${r.airtable_id}`, r.view as ViewKind]))
}

// Разбор наших фото (scripts/kb-vision.mjs → <bucket>/_vision.json): бассейн,
// вид, стиль, состояние — то, что у Booking записано в удобствах варианта.
async function vision(bucket: string): Promise<VisionManifest> {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/_vision.json`)
  if (!r.ok) throw new Error(`${bucket}/_vision.json: ${r.status}`)
  return (await r.json()) as VisionManifest
}

// Главный вид с фото: природный важнее сада и бассейна. Пустой список — вида
// на фото просто не видно, а не «вида нет»: такой объект без строки о виде.
const VIEW_ORDER: [string, ViewKind][] = [
  ['ocean', 'ocean'], ['jungle', 'jungle'], ['rice_field', 'rice_field'], ['river_valley', 'river_valley'],
  ['mountain', 'mountain'], ['city', 'city'], ['garden', 'garden'],
]
function photoView(f: VisionFeatures | undefined): ViewKind | null {
  const v = f?.view ?? []
  return VIEW_ORDER.find(([k]) => v.includes(k))?.[1] ?? null
}

// Частный бассейн: по фото (private/infinity — да, shared — нет) или по полю
// «Бассейн». У виллы «бассейна на фото нет» — не довод: его часто просто не
// сняли, а частный бассейн у ~90% вилл на Booking; такая вилла — «не знаем»,
// и ступень подбора «такой же бассейн» пропускается. У апартаментов без
// бассейна на фото — нет своего.
function privatePool(kind: ListingKind, f: VisionFeatures | undefined, raw: string | null): boolean | null {
  if (f?.pool_type === 'private' || f?.pool_type === 'infinity') return true
  if (f?.pool_type === 'shared') return false
  if (raw && /нет|no/i.test(raw)) return false
  if (raw && kind === 'villa' && /[а-яa-z]/i.test(raw)) return true
  if (kind === 'apartment' && f?.pool === false) return false
  return null
}

// Соседи на Booking того же типа и спальности: медиана цены ночи и загрузки
// за всё время сбора, без сетевых отелей (миграция 138). Рядом — 2 км, если
// там меньше пяти — 3 км (владелец 31.10.2026: «1–2 км, максимум 3»);
// отдельно — округа 10 км. Сбой — объект без шанса, а не падение пересчёта.
const HISTORY_SINCE = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)
const NEAR_RADII_M = [2000, 3000]
const AREA_RADIUS_M = 10000
async function neighbours(lat: number, lng: number, radiusM: number, kind: ListingKind, bedrooms: number | null): Promise<NeighbourPerf[]> {
  const { data, error } = await sb.rpc('booking_neighbour_perf', {
    p_lat: lat, p_lng: lng, p_radius_m: radiusM, p_unit_kind: kind, p_bedrooms: bedrooms, p_since: HISTORY_SINCE,
  })
  if (error) throw new Error(`booking_neighbour_perf: ${error.message}`)
  return ((data ?? []) as { price: number; occupancy: number; private_pool: boolean | null; size_m2: number | null }[]).map(r => ({
    price: Number(r.price), occupancy: Number(r.occupancy),
    privatePool: r.private_pool ?? null, sizeM2: r.size_m2 != null ? Number(r.size_m2) : null,
  }))
}

async function coasts(): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('listing_geo_facts').select('kind, airtable_id, coast:climate->coast_m').range(from, from + 999)
    if (error) throw new Error(`listing_geo_facts: ${error.message}`)
    for (const r of data ?? []) if (r.coast != null && Number.isFinite(Number(r.coast))) out.set(`${r.kind}:${r.airtable_id}`, Number(r.coast))
    if (!data || data.length < 1000) return out
  }
}

// «нет» в поле разрешения — значение по умолчанию, а не ответ застройщика.
const realPermit = (v: string | null) => (v && v.toLowerCase() !== 'нет' ? v : null)

async function main() {
  const [villas, apts, cx, manualView, coastOf, villaVision, aptVision] = await Promise.all([
    published('raw_villas'), published('raw_apartments'), complexFacts(), manualViews(), coasts(),
    vision('villa-photos'), vision('apartment-photos'),
  ])
  const units: ({ kind: ListingKind } & Facts)[] = [
    ...villas.map(f => ({ kind: 'villa' as const, ...f })),
    ...apts.map(f => ({ kind: 'apartment' as const, ...f })),
  ]
  const rows: Record<string, unknown>[] = []
  const profiles: Record<string, unknown>[] = []
  const photoViews: Record<string, unknown>[] = []
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
        const key = `${u.kind}:${u.id}`
        // Юнит в формате Booking (listing_profile): по нему подбираются соседи.
        const vf = (u.kind === 'villa' ? villaVision : aptVision)[u.id]?.features
        const profile: UnitProfile = {
          unitKind: u.kind, bedrooms: snap.villa.bedrooms, areaM2: snap.villa.area,
          privatePool: privatePool(u.kind, vf, u.pool),
        }
        const fromPhotos = photoView(vf)
        const coastM = coastOf.get(key) ?? null
        profiles.push({
          kind: u.kind, airtable_id: u.id, unit_kind: u.kind, bedrooms: profile.bedrooms, area_m2: profile.areaM2,
          private_pool: profile.privatePool, pool_type: vf?.pool_type ?? (vf?.pool === false ? 'none' : null),
          views: vf?.view ?? null, sea_view: vf?.view ? vf.view.includes('ocean') : null,
          style: vf?.style ?? null, condition: vf?.condition ?? null,
          guests: profile.bedrooms != null ? Math.max(2, profile.bedrooms * 2) : null,
          coast_m: coastM != null ? Math.round(coastM) : null, updated_at: new Date().toISOString(),
        })
        if (fromPhotos && !manualView.has(key)) photoViews.push({ kind: u.kind, airtable_id: u.id, view: fromPhotos, source: 'photos', rated_at: new Date().toISOString() })
        const factors = computeFactors({
          snap,
          permit: realPermit(u.permit) ?? realPermit(c?.permit ?? null),
          landColor: u.land ?? c?.land ?? null,
          view: manualView.get(key) ?? fromPhotos,
          coastM,
        })
        const low = range ? Math.min(range.bad, y.pct.beforeTax) : null
        // Шанс по соседям — только у посуточной: соседи на Booking сдаются посуточно.
        let odds: { k: number; n: number } | null = null
        let oddsRadius: number | null = null
        let area: { k: number; n: number } | null = null
        let match: Match | null = null
        if (low != null && y.mode === 'daily') {
          const { lat, lng, bedrooms } = snap.villa
          for (const r of NEAR_RADII_M) {
            const picked = pickSimilar(await neighbours(lat, lng, r, u.kind, bedrooms), profile)
            odds = neighbourChance(snap, low, picked.rows)
            if (odds) { oddsRadius = r; match = picked.match; break }
          }
          const wide = pickSimilar(await neighbours(lat, lng, AREA_RADIUS_M, u.kind, bedrooms), profile)
          area = neighbourChance(snap, low, wide.rows)
          if (!odds && area) match = wide.match
        }
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
          cap_low: low,
          cap_high: range ? Math.max(range.good, y.pct.beforeTax) : null,
          chance: odds ? Math.round((odds.k / odds.n) * 100) : null,
          chance_k: odds?.k ?? null, chance_n: odds?.n ?? null, chance_radius_m: oddsRadius,
          area_k: area?.k ?? null, area_n: area?.n ?? null, match,
          factors, complex_id: c?.id ?? null,
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
  for (let i = 0; i < profiles.length; i += 500) {
    const { error } = await sb.from('listing_profile').upsert(profiles.slice(i, i + 500))
    if (error) throw new Error(`listing_profile: ${error.message}`)
  }
  for (let i = 0; i < photoViews.length; i += 500) {
    const { error } = await sb.from('listing_views').upsert(photoViews.slice(i, i + 500))
    if (error) throw new Error(`listing_views: ${error.message}`)
  }
  // Снятые с публикации — убрать, чтобы каталог не тянул их старые цифры.
  const keep = new Set(rows.map(r => `${r.kind}:${r.airtable_id}`))
  const { data: old } = await sb.from('listing_yields').select('kind, airtable_id')
  const gone = (old ?? []).filter(r => !keep.has(`${r.kind}:${r.airtable_id}`))
  for (const g of gone) await sb.from('listing_yields').delete().eq('kind', g.kind).eq('airtable_id', g.airtable_id)
  console.log(`listing_profile: ${profiles.length}, views from photos: ${photoViews.length}`)
  console.log(`listing_yields: ${rows.length} written, ${gone.length} removed, ${failed} failed, ${units.length - rows.length - failed} without yield`)
}

main().catch(e => { console.error(e); process.exit(1) })
