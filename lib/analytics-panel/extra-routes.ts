import { unstable_cache } from 'next/cache'

// Маршруты от виллы до ближайшего пляжа и мест из топа TripAdvisor для «Как
// добраться» (владелец 18.11.2026). Бесплатный OSRM по дорогам OpenStreetMap —
// тот же, что в scripts/routes-free.ts; ответ кэшируется на 30 дней на точку,
// чтобы не дёргать демо-сервер при каждом показе страницы.

export type ExtraDest = { key: string; name: string; lat: number; lng: number; kind: 'beach' | 'ta' }
export type ExtraRoute = ExtraDest & { coords: number[][]; minutes: number; meters: number }

async function osrmRoute(from: { lat: number; lng: number }, to: ExtraDest): Promise<ExtraRoute | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=simplified&geometries=geojson`
  const r = await fetch(url, { headers: { 'User-Agent': 'balinsky-site/1.0' }, signal: AbortSignal.timeout(6000) })
  if (!r.ok) return null
  const j = await r.json() as { code?: string; routes?: { duration: number; distance: number; geometry: { coordinates: number[][] } }[] }
  const rt = j.code === 'Ok' ? j.routes?.[0] : null
  if (!rt) return null
  return { ...to, coords: rt.geometry.coordinates, minutes: Math.max(1, Math.round(rt.duration / 60)), meters: Math.round(rt.distance) }
}

async function build(lat: number, lng: number, destsJson: string): Promise<ExtraRoute[]> {
  const dests = JSON.parse(destsJson) as ExtraDest[]
  const out: ExtraRoute[] = []
  // По очереди: у демо-сервера OSRM лимит ~1 запрос в секунду.
  for (const d of dests) {
    try { const r = await osrmRoute({ lat, lng }, d); if (r) out.push(r) } catch (e) { console.error('extra-routes', d.name, e) }
  }
  return out
}

export function loadExtraRoutes(lat: number, lng: number, dests: ExtraDest[]): Promise<ExtraRoute[]> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}:${dests.map(d => d.key).join('|')}`
  return unstable_cache(() => build(lat, lng, JSON.stringify(dests)), ['analytics-extra-routes-v1', key], { revalidate: 30 * 24 * 3600 })()
}

// Время в пути до многих точек одним запросом (OSRM table), кэш 30 дней.
export type Travel = Record<string, { min: number; meters: number }>
async function buildTable(lat: number, lng: number, ptsJson: string): Promise<Travel> {
  const pts = JSON.parse(ptsJson) as { key: string; lat: number; lng: number }[]
  if (!pts.length) return {}
  const coords = [`${lng},${lat}`, ...pts.map(p => `${p.lng},${p.lat}`)].join(';')
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration,distance`
  const r = await fetch(url, { headers: { 'User-Agent': 'balinsky-site/1.0' }, signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`OSRM table ${r.status}`)
  const j = await r.json() as { code?: string; durations?: (number | null)[][]; distances?: (number | null)[][] }
  if (j.code !== 'Ok' || !j.durations || !j.distances) throw new Error(`OSRM table ${j.code}`)
  const out: Travel = {}
  pts.forEach((p, i) => {
    const s = j.durations![0][i + 1], m = j.distances![0][i + 1]
    if (s != null && m != null) out[p.key] = { min: Math.max(1, Math.round(s / 60)), meters: Math.round(m) }
  })
  return out
}
export function loadTravelTimes(lat: number, lng: number, pts: { key: string; lat: number; lng: number }[]): Promise<Travel> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}:${pts.map(p => p.key).join('|')}`
  return unstable_cache(() => buildTable(lat, lng, JSON.stringify(pts.slice(0, 90))), ['analytics-travel-v1', key], { revalidate: 30 * 24 * 3600 })()
}
