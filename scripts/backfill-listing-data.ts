// Дозаполнение данных для объектов, которых нет в заготовках страницы
// (новые ЖК и юниты, импорт с newhomes.id 2026-09-26 и всё, что заведут после).
// Только бесплатные источники — ни одного платного API:
//
//   surroundings — «Что вокруг»: та же выборка, что SQL-функция
//                  refresh_listing_surroundings (миграция 054), по нашей базе
//                  bali_places. Сама функция пересчитывает все объекты разом и
//                  не укладывается в лимит времени запроса через API.
//   nearby       — «Что рядом» (_nearby_places/<id>.json): места, уже скачанные
//                  из Google для соседних объектов, с теми же радиусами и
//                  сортировкой, что scripts/sync-nearby-places.mjs.
//   climate      — погода и воздух: они считаются по сетке ~5 км
//                  (build-listing-environment.mjs), поэтому копируются у объекта
//                  из той же клетки — значения ровно те же, что дал бы скрипт.
//
// Маршруты до аэропорта/районов, высоту, солнце на крыше и балл спроса этот
// скрипт НЕ считает: для них нужны платные Google Routes / Solar и разбор фото.
//
//   npx tsx --env-file=.env.local scripts/backfill-listing-data.ts            # показать, что будет
//   npx tsx --env-file=.env.local scripts/backfill-listing-data.ts --apply    # записать
import { sbAdmin } from '../lib/market/apply'

const sb = sbAdmin()
const APPLY = process.argv.includes('--apply')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type Kind = 'villa' | 'apartment' | 'complex'
type Target = { kind: Kind; id: string; lat: number; lng: number; published: boolean }

function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (d: number) => (d * Math.PI) / 180
  const c = Math.sin(r(lat1)) * Math.sin(r(lat2)) + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.cos(r(lng2 - lng1))
  return 6371000 * Math.acos(Math.min(1, Math.max(-1, c)))
}

function num(v: unknown): number | null {
  if (Array.isArray(v)) return num(v[0])
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') { const m = v.match(/-?\d+\.\d+/); return m ? Number(m[0]) : null }
  return null
}

async function pageAll<T>(table: string, select: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select).range(from, from + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function loadTargets(): Promise<Target[]> {
  const out: Target[] = []
  const tables: Array<[string, Kind]> = [['raw_villas', 'villa'], ['raw_apartments', 'apartment'], ['raw_complexes', 'complex']]
  for (const [table, kind] of tables) {
    const rows = await pageAll<{ airtable_id: string; data: Record<string, unknown> }>(table, 'airtable_id, data')
    for (const r of rows) {
      const lat = num(r.data?.['Geo']); const lng = num(r.data?.['Geo 2'])
      // Та же рамка, что во вьюхе listing_geo: точки вне Бали — мусор.
      if (lat == null || lng == null || lat < -8.95 || lat > -8.02 || lng < 114.4 || lng > 115.8) continue
      const published = kind === 'complex' ? true : r.data?.['Опубликовать'] === true
      out.push({ kind, id: r.airtable_id, lat, lng, published })
    }
  }
  return out
}

// ------------------------------------------------------------ surroundings --

type Place = {
  id: string; name: string | null; bucket: string | null; primary_type: string | null
  rating: number | null; user_rating_count: number | null; price_level: string | null
  lat: number; lng: number; photo_url: string | null; photo_attr: unknown; tourist_grade: string | null
  photo: string | null
}

async function loadPlaces(): Promise<Place[]> {
  return pageAll<Place>('bali_places',
    'id, name, bucket, primary_type, rating, user_rating_count, price_level, lat, lng, photo_url, photo_attr, tourist_grade, photo:data->photos->0->>name')
}

function surroundingsFor(t: Target, places: Place[]) {
  const box = (p: Place, d: number) => p.lat >= t.lat - d && p.lat <= t.lat + d && p.lng >= t.lng - d && p.lng <= t.lng + d
  const near = places
    .filter(p => box(p, 0.05) && (p.rating ?? 0) >= 4.2 && (p.user_rating_count ?? 0) >= 50 && p.bucket && p.bucket !== 'other')
    .map(p => ({ p, d: distM(t.lat, t.lng, p.lat, p.lng), premium: (p.rating ?? 0) >= 4.5 && (p.user_rating_count ?? 0) >= 300 }))
  const agg = (pred: (x: { d: number; premium: boolean }) => boolean) => {
    const o: Record<string, number> = {}
    for (const x of near) if (pred(x)) o[x.p.bucket!] = (o[x.p.bucket!] ?? 0) + 1
    return o
  }
  const sample = places.filter(p => box(p, 0.03) && p.tourist_grade && (p.user_rating_count ?? 0) >= 10 && (p.user_rating_count ?? 0) <= 300
    && distM(t.lat, t.lng, p.lat, p.lng) <= 3000)
  const tourist = sample.filter(p => p.tourist_grade === 'tourist_only' || p.tourist_grade === 'tourist_mostly').length
  const top = places
    .filter(p => box(p, 0.05) && (p.rating ?? 0) >= 4.5 && (p.user_rating_count ?? 0) >= 300 && p.bucket && p.bucket !== 'other' && p.bucket !== 'temple')
    .map(p => ({ p, d: distM(t.lat, t.lng, p.lat, p.lng) }))
    .filter(x => x.d <= 5000)
    .sort((a, b) => a.d - b.d)
    .slice(0, 20)
    .map(({ p, d }) => ({
      id: p.id, name: p.name, bucket: p.bucket, type: p.primary_type, rating: p.rating, reviews: p.user_rating_count,
      price: p.price_level, lat: p.lat, lng: p.lng, dist_m: Math.round(d), photo: p.photo,
      photo_url: p.photo_url, photo_attr: p.photo_attr, tourist_grade: p.tourist_grade,
    }))
  return {
    r1: agg(x => x.d <= 1000), r3: agg(x => x.d <= 3000), r5: agg(x => x.d <= 5000), premium3: agg(x => x.d <= 3000 && x.premium),
    tourist_env: { sampled: sample.length, tourist, share: sample.length >= 10 ? Math.round((100 * tourist) / sample.length) : null },
    top,
  }
}

// ------------------------------------------------------------------ nearby --

// Радиусы и порядок — как в scripts/sync-nearby-places.mjs.
const NEARBY_RADIUS: Record<string, number> = {
  beach: 5000, restaurant: 2000, cafe: 2000, nightlife: 3000, attraction: 5000, school: 5000, preschool: 3000,
  supermarket: 1500, pharmacy: 2000, hospital: 5000, shopping_mall: 5000, ferry_terminal: 8000,
  wellness: 1500, beachclub: 5000, international_school: 8000, coworking: 3000, luxury_hotel: 4000,
}
// Для текстовых категорий Google ищет в радиусе, но отдаёт и дальние места;
// в пуле они есть, а у соседа — нет. Для «Что рядом» хватает того же радиуса.
const score = (x: { rating?: number | null; reviews?: number | null }) => (x.rating ?? 0) * Math.log10((x.reviews ?? 0) + 10)

type NearbyPlace = { id: string; name: string | null; rating: number | null; reviews: number | null; lat: number; lng: number; distanceKm: number; [k: string]: unknown }
type NearbyIndex = { generatedAt: string; categories: Array<{ key: string; title: string }>; ids: string[] }

async function loadNearbyIndex(): Promise<NearbyIndex> {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places.json`, { cache: 'no-store' })
  return r.json()
}

async function loadNearbyPool(ids: string[]): Promise<{ pool: Map<string, Map<string, NearbyPlace>>; sources: Array<{ lat: number; lng: number }> }> {
  const pool = new Map<string, Map<string, NearbyPlace>>()
  const sources: Array<{ lat: number; lng: number }> = []
  let i = 0
  const queue = [...ids]
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const id = queue.shift()!
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places/${id}.json`)
      if (!r.ok) continue
      const byCat = (await r.json()) as Record<string, NearbyPlace[]>
      for (const [cat, list] of Object.entries(byCat)) {
        const m = pool.get(cat) ?? new Map<string, NearbyPlace>()
        for (const p of list ?? []) if (p?.id && p.lat != null && p.lng != null && !m.has(p.id)) m.set(p.id, p)
        pool.set(cat, m)
      }
      if (++i % 100 === 0) console.log(`  пул «Что рядом»: прочитано ${i}/${ids.length}`)
    }
  }))
  return { pool, sources }
}

function nearbyFor(t: Target, pool: Map<string, Map<string, NearbyPlace>>): Record<string, NearbyPlace[]> {
  const out: Record<string, NearbyPlace[]> = {}
  for (const [cat, places] of pool) {
    const radius = NEARBY_RADIUS[cat] ?? 3000
    out[cat] = [...places.values()]
      .map(p => ({ ...p, distanceKm: distM(t.lat, t.lng, p.lat, p.lng) / 1000 }))
      .filter(p => p.distanceKm * 1000 <= radius)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 30)
  }
  return out
}

// ----------------------------------------------------------------- climate --

const GRID = 0.05
const cellOf = (lat: number, lng: number) => `${Math.round(lat / GRID)}:${Math.round(lng / GRID)}`

// ------------------------------------------------------------------- main --

async function main() {
  const targets = await loadTargets()
  const byKey = (k: Kind, id: string) => `${k}|${id}`

  const surr = new Set((await pageAll<{ kind: string; airtable_id: string }>('listing_surroundings', 'kind, airtable_id')).map(r => byKey(r.kind as Kind, r.airtable_id)))
  const geo = await pageAll<{ kind: string; airtable_id: string; lat: number; lng: number; climate: unknown; air: unknown }>('listing_geo_facts', 'kind, airtable_id, lat, lng, climate, air')
  const geoKeys = new Set(geo.map(r => byKey(r.kind as Kind, r.airtable_id)))
  const index = await loadNearbyIndex()
  const nearbyIds = new Set(index.ids)

  const needSurr = targets.filter(t => !surr.has(byKey(t.kind, t.id)))
  const needGeo = targets.filter(t => !geoKeys.has(byKey(t.kind, t.id)))
  // «Что рядом» читают страницы юнитов; страница ЖК берёт его у своего юнита.
  const needNearby = targets.filter(t => t.kind !== 'complex' && t.published && !nearbyIds.has(t.id))
  console.log(`объектов с координатами: ${targets.length}`)
  console.log(`нет «Что вокруг»: ${needSurr.length} · нет погоды/воздуха: ${needGeo.length} · нет «Что рядом»: ${needNearby.length}`)

  // 1. «Что вокруг»
  if (needSurr.length) {
    const places = await loadPlaces()
    console.log(`bali_places: ${places.length} мест`)
    const rows = needSurr.map(t => ({ kind: t.kind, airtable_id: t.id, lat: t.lat, lng: t.lng, data: surroundingsFor(t, places), updated_at: new Date().toISOString() }))
    const empty = rows.filter(r => !r.data.top.length && !Object.keys(r.data.r3).length).length
    console.log(`«Что вокруг»: ${rows.length} объектов, из них пустых (вокруг нет мест из базы): ${empty}`)
    if (APPLY) {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await sb.from('listing_surroundings').upsert(rows.slice(i, i + 200), { onConflict: 'kind,airtable_id' })
        if (error) throw new Error(`listing_surroundings: ${error.message}`)
      }
    }
  }

  // 2. Погода и воздух — копия из той же клетки сетки.
  if (needGeo.length) {
    const byCell = new Map<string, { climate: unknown; air: unknown }>()
    for (const g of geo) {
      if (!g.climate) continue
      const k = cellOf(g.lat, g.lng)
      if (!byCell.has(k)) byCell.set(k, { climate: g.climate, air: g.air })
    }
    const rows = needGeo.flatMap(t => {
      const src = byCell.get(cellOf(t.lat, t.lng))
      return src ? [{ kind: t.kind, airtable_id: t.id, lat: t.lat, lng: t.lng, climate: src.climate, air: src.air, computed_at: new Date().toISOString() }] : []
    })
    console.log(`погода/воздух: скопировано из своей клетки ${rows.length} из ${needGeo.length}; без соседа в клетке: ${needGeo.length - rows.length}`)
    if (APPLY && rows.length) {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await sb.from('listing_geo_facts').upsert(rows.slice(i, i + 200), { onConflict: 'kind,airtable_id' })
        if (error) throw new Error(`listing_geo_facts: ${error.message}`)
      }
    }
  }

  // 3. «Что рядом» — из мест, уже скачанных для соседей.
  if (needNearby.length) {
    const { pool } = await loadNearbyPool(index.ids)
    console.log(`пул «Что рядом»: ${[...pool.values()].reduce((s, m) => s + m.size, 0)} мест в ${pool.size} категориях`)
    const results = needNearby.map(t => ({ t, byCat: nearbyFor(t, pool) }))
    const thin = results.filter(r => (r.byCat.restaurant?.length ?? 0) + (r.byCat.cafe?.length ?? 0) + (r.byCat.beach?.length ?? 0) < 3)
    console.log(`«Что рядом»: ${results.length} объектов, почти пустых (рядом нет скачанных мест): ${thin.length}`)
    for (const r of thin.slice(0, 10)) console.log(`   почти пусто: ${r.t.kind} ${r.t.id} (${r.t.lat.toFixed(3)}, ${r.t.lng.toFixed(3)})`)
    if (APPLY) {
      const ok: string[] = []
      const queue = results.filter(r => !thin.includes(r))
      await Promise.all(Array.from({ length: 4 }, async () => {
        while (queue.length) {
          const { t, byCat } = queue.shift()!
          const { error } = await sb.storage.from('competitors').upload(`_nearby_places/${t.id}.json`, JSON.stringify(byCat), { contentType: 'application/json', upsert: true })
          if (error) console.warn(`  ✖ ${t.id}: ${error.message}`)
          else ok.push(t.id)
        }
      }))
      // Индекс перечитываем прямо перед записью: страница ищет объект сначала в нём.
      const fresh = await loadNearbyIndex()
      const ids = [...new Set([...fresh.ids, ...ok])]
      const { error } = await sb.storage.from('competitors').upload('_nearby_places.json', JSON.stringify({ ...fresh, generatedAt: new Date().toISOString(), ids }), { contentType: 'application/json', upsert: true })
      if (error) throw new Error(`индекс «Что рядом»: ${error.message}`)
      console.log(`«Что рядом»: записано ${ok.length}, в индексе ${ids.length}`)
    }
  }

  if (!APPLY) console.log('\n(ничего не записано — запусти с --apply)')
}

main().catch(e => { console.error(e); process.exit(1) })
