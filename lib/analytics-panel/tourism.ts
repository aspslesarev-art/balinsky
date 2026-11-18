import { createClient } from '@supabase/supabase-js'
import { loadReviewHeat, type HeatCell } from '@/lib/reviews-heat'
import { TA_RANK, TA_SNAPSHOT } from '@/lib/tripadvisor-top'

// «Уровень туризма» для блока аналитики (владелец 18.11.2026): тепловая карта
// туристов (bali_places, взвешено по иностранным отзывам — _heat_tourists.json)
// и места из топ‑90 TripAdvisor по Бали с расстоянием до виллы.

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371, rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export type TaPlace = { name: string; rank: number; km: number; lat: number; lng: number; photo: string | null }
export type Tourism = {
  /** Сумма «туристического веса» клеток в 1 км. */
  heat1km: number
  /** Доля туристических точек Бали, где туристов меньше, чем здесь, 0–100. */
  percentile: number
  /** Клетки тепловой карты в 3 км — для карты. */
  cells: HeatCell[]
  heatMax: number
  ta: TaPlace[]
  taSnapshot: string
}

let _taCache: { ts: number; rows: { id: string; name: string; lat: number; lng: number; photo: string | null }[] } | null = null

async function taPlaces() {
  if (_taCache && Date.now() - _taCache.ts < 24 * 3600 * 1000) return _taCache.rows
  const ids = Object.keys(TA_RANK)
  const { data, error } = await sb.from('bali_places').select('id, name, lat, lng, photo_url').in('id', ids)
  if (error) throw new Error(`tourism ta: ${error.message}`)
  const rows = (data ?? []).filter(r => r.name && r.lat != null && r.lng != null)
    .map(r => ({ id: r.id as string, name: r.name as string, lat: Number(r.lat), lng: Number(r.lng), photo: (r.photo_url as string | null) ?? null }))
  _taCache = { ts: Date.now(), rows }
  return rows
}

const sum1km = (cells: HeatCell[], lat: number, lng: number) =>
  cells.reduce((s, c) => (km(lat, lng, c.lat, c.lng) <= 1 ? s + c.weight : s), 0)

export async function loadTourism(lat: number, lng: number): Promise<Tourism | null> {
  const [heat, ta] = await Promise.all([loadReviewHeat(), taPlaces()])
  if (!heat.cells.length) return null
  const heat1km = sum1km(heat.cells, lat, lng)
  // Та же мерка для каждой туристической клетки — где здесь вилла среди них.
  const all = heat.cells.map(c => sum1km(heat.cells, c.lat, c.lng)).sort((a, b) => a - b)
  const below = all.filter(v => v < heat1km).length
  const percentile = Math.round((below / all.length) * 100)
  // Одно место бывает несколькими карточками Google с одним рангом — берём ближайшую.
  const byRank = new Map<number, TaPlace>()
  for (const r of ta) {
    const rank = TA_RANK[r.id]
    const d = km(lat, lng, r.lat, r.lng)
    const prev = byRank.get(rank)
    if (!prev || d < prev.km) byRank.set(rank, { name: r.name, rank, km: d, lat: r.lat, lng: r.lng, photo: r.photo ?? prev?.photo ?? null })
    else if (prev && !prev.photo && r.photo) prev.photo = r.photo
  }
  return {
    heat1km, percentile, heatMax: heat.max,
    cells: heat.cells.filter(c => km(lat, lng, c.lat, c.lng) <= 3.2),
    ta: [...byRank.values()].sort((a, b) => a.km - b.km),
    taSnapshot: TA_SNAPSHOT,
  }
}
