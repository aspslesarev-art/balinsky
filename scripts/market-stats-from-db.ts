// «Почём сдают соседи» (<kind>_market_stats) из нашей базы Booking.
//
// Раньше таблицы наполнял scripts/estatemarket_occupancy.py, ходивший в
// открытый API estatemarket.io; в сентябре 2026 API сменил формат, и скрипт
// перестал работать. Те же данные у нас уже лежат в booking_data_locations /
// booking_data_cards (обновляются ежедневно), поэтому считаем из них — по
// тем же правилам, что старый скрипт:
//   • объекты Booking в радиусе 500 м от объекта сайта;
//   • вилла — карточка с type villa/villas, апартаменты — apartment/apartments;
//   • цена за ночь — price из локации, иначе середина min/max карточки;
//   • средняя цена — только если цен 3 и больше; загрузка — среднее.
// Пересчитываются все объекты, чтобы цифры на соседних страницах были
// посчитаны одинаково.
//
//   npx tsx --env-file=.env.local scripts/market-stats-from-db.ts           # сравнить со старыми
//   npx tsx --env-file=.env.local scripts/market-stats-from-db.ts --apply   # записать
import { sbAdmin } from '../lib/market/apply'

const sb = sbAdmin()
const APPLY = process.argv.includes('--apply')
const RADIUS_M = 500
const VILLA = new Set(['villa', 'villas'])
const APT = new Set(['apartment', 'apartments'])
type Kind = 'villa' | 'apartment' | 'complex'

async function pageAll<T>(table: string, select: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data as unknown as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (d: number) => (d * Math.PI) / 180
  const c = Math.sin(r(lat1)) * Math.sin(r(lat2)) + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.cos(r(lng2 - lng1))
  return 6371000 * Math.acos(Math.min(1, Math.max(-1, c)))
}

const round2 = (v: number) => Math.round(v * 100) / 100
const mean = (a: number[]) => (a.length ? round2(a.reduce((s, v) => s + v, 0) / a.length) : null)

async function main() {
  type Loc = { id: number; occupancy: number | null; price: number | null; lat: number | null; lng: number | null }
  type Card = { id: number; type: string | null; min_price: number | null; max_price: number | null }
  const locs = (await pageAll<Loc>('booking_data_locations', 'id, occupancy, price, lat, lng')).filter(l => l.lat != null && l.lng != null)
  const cards = new Map((await pageAll<Card>('booking_data_cards', 'id, type, min_price, max_price')).map(c => [c.id, c]))
  // Сетка ~1 км, чтобы не перебирать 29 тыс. объектов для каждой точки.
  const cell = (lat: number, lng: number) => `${Math.floor(lat * 100)}:${Math.floor(lng * 100)}`
  const grid = new Map<string, Loc[]>()
  for (const l of locs) { const k = cell(l.lat!, l.lng!); (grid.get(k) ?? grid.set(k, []).get(k)!).push(l) }
  console.log(`Booking: ${locs.length} объектов`)

  const geo = await pageAll<{ kind: Kind; airtable_id: string; lat: number; lng: number }>('listing_geo', 'kind, airtable_id, lat, lng')
  const rows = geo.map(g => {
    const near: Loc[] = []
    const ci = Math.floor(g.lat * 100), cj = Math.floor(g.lng * 100)
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      for (const l of grid.get(`${ci + di}:${cj + dj}`) ?? []) if (distM(g.lat, g.lng, l.lat!, l.lng!) <= RADIUS_M) near.push(l)
    }
    const v = { n: 0, occ: [] as number[], price: [] as number[] }
    const a = { n: 0, occ: [] as number[], price: [] as number[] }
    for (const l of near) {
      const c = cards.get(l.id)
      if (!c) continue
      const t = (c.type ?? '').toLowerCase().trim()
      const b = VILLA.has(t) ? v : APT.has(t) ? a : null
      if (!b) continue
      b.n++
      if (l.occupancy != null) b.occ.push(Number(l.occupancy))
      const p = l.price ?? (c.min_price != null && c.max_price != null ? (c.min_price + c.max_price) / 2 : c.min_price ?? c.max_price)
      if (p != null) b.price.push(Number(p))
    }
    const stats = (b: typeof v) => {
      const occ = mean(b.occ)
      const adr = b.price.length >= 3 ? mean(b.price) : null
      return { count: b.n, occ, adr, revpar: occ != null && adr != null ? round2((occ / 100) * adr) : null }
    }
    const vs = stats(v), as = stats(a)
    return {
      kind: g.kind,
      row: {
        airtable_id: g.airtable_id, lat: g.lat, lon: g.lng, total_listings_500m: near.length,
        villa_count: vs.count, villa_occupancy_pct: vs.occ, villa_adr_usd: vs.adr, villa_revpar_usd: vs.revpar,
        apartment_count: as.count, apartment_occupancy_pct: as.occ, apartment_adr_usd: as.adr, apartment_revpar_usd: as.revpar,
        synced_at: new Date().toISOString(),
      },
    }
  })

  // Сравнение со старыми цифрами — что увидит посетитель.
  for (const kind of ['villa', 'apartment', 'complex'] as const) {
    const old = new Map((await pageAll<{ airtable_id: string; villa_adr_usd: number | null; apartment_adr_usd: number | null }>(`${kind}_market_stats`, 'airtable_id, villa_adr_usd, apartment_adr_usd')).map(o => [o.airtable_id, o]))
    const mine = rows.filter(r => r.kind === kind)
    let wasShown = 0, nowShown = 0, newRows = 0
    const shift: number[] = []
    for (const { row } of mine) {
      const o = old.get(row.airtable_id)
      const field = kind === 'apartment' ? 'apartment_adr_usd' : 'villa_adr_usd'
      if (!o) newRows++
      if (o?.[field] != null) wasShown++
      if (row[field] != null) nowShown++
      if (o?.[field] != null && row[field] != null) shift.push(row[field]! / o[field]! - 1)
    }
    shift.sort((x, y) => x - y)
    const med = shift.length ? Math.round(shift[Math.floor(shift.length / 2)] * 100) : null
    console.log(`${kind}: объектов ${mine.length} (новых ${newRows}); цена соседей показывалась у ${wasShown}, будет у ${nowShown}; у тех, где была, медианный сдвиг ${med}%`)
  }

  if (!APPLY) { console.log('\n(ничего не записано — запусти с --apply)'); return }
  for (const kind of ['villa', 'apartment', 'complex'] as const) {
    const list = rows.filter(r => r.kind === kind).map(r => r.row)
    for (let i = 0; i < list.length; i += 500) {
      const { error } = await sb.from(`${kind}_market_stats`).upsert(list.slice(i, i + 500), { onConflict: 'airtable_id' })
      if (error) throw new Error(`${kind}_market_stats: ${error.message}`)
    }
    console.log(`${kind}_market_stats: записано ${list.length}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
