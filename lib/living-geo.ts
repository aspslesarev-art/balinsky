// Шум и вулкан по координатам объекта — для «Для жизни» (lib/living.ts).
// Данные: OpenStreetMap (competitors/_osm_noise.json, scripts/osm-noise.mjs) —
// большие дороги, мечети, полоса аэропорта Нгурах-Рай. Считается раз в сутки
// в scripts/build-listing-living.ts и лежит в listing_living.
//
// Мечети в OSM по Бали отмечены не все (137 на остров), поэтому «мечеть
// рядом» — только найденная; отсутствие ничего не доказывает и тишине
// баллов не добавляет.

export type OsmNoise = {
  roads: ['big' | 'mid', [number, number][]][]
  mosques: [number, number][]
  runway: [[number, number], [number, number]]
}

export type GeoNoise = {
  /** Расстояние до ближайшей большой (big) или средней (mid) дороги, м. */
  road_m: number | null
  road_class: 'big' | 'mid' | null
  /** Ближайшая мечеть в 500 м, м; дальше — null. */
  mosque_m: number | null
  /** 'near' — до полосы до 2,5 км, 'path' — под заходом на посадку. */
  flight: 'near' | 'path' | null
  volcano: 'agung' | 'batur' | null
  volcano_km: number | null
}

const M_PER_DEG = 111_320

// Плоская проекция вокруг точки: на масштабе сотен метров ошибка ничтожна.
function toXY(lat: number, lng: number, lat0: number): [number, number] {
  return [lng * M_PER_DEG * Math.cos(lat0 * Math.PI / 180), lat * M_PER_DEG]
}

function segDist(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

// Сетка дорог по ~0,01° (~1,1 км), чтобы не перебирать весь остров на объект.
const CELL = 0.01
export function indexRoads(osm: OsmNoise) {
  const cells = new Map<string, { cls: 'big' | 'mid'; a: [number, number]; b: [number, number] }[]>()
  for (const [cls, pts] of osm.roads) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]
      const keys = new Set([
        `${Math.floor(a[0] / CELL)},${Math.floor(a[1] / CELL)}`,
        `${Math.floor(b[0] / CELL)},${Math.floor(b[1] / CELL)}`,
      ])
      for (const k of keys) {
        const list = cells.get(k) ?? []
        list.push({ cls, a, b })
        cells.set(k, list)
      }
    }
  }
  return cells
}

const VOLCANOES = [
  { key: 'agung' as const, lat: -8.3433, lng: 115.5083 },
  { key: 'batur' as const, lat: -8.2420, lng: 115.3750 },
]
// Дальше 25 км вулкан для жизни не довод — не показываем.
const VOLCANO_SHOW_KM = 25

export function computeGeoNoise(lat: number, lng: number, osm: OsmNoise, roadCells: ReturnType<typeof indexRoads>): GeoNoise {
  const p = toXY(lat, lng, lat)
  let bestBig = Infinity, bestMid = Infinity
  const ci = Math.floor(lat / CELL), cj = Math.floor(lng / CELL)
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    for (const s of roadCells.get(`${ci + di},${cj + dj}`) ?? []) {
      const d = segDist(p, toXY(s.a[0], s.a[1], lat), toXY(s.b[0], s.b[1], lat))
      if (s.cls === 'big') bestBig = Math.min(bestBig, d)
      else bestMid = Math.min(bestMid, d)
    }
  }
  // Большая дорога в 300 м важнее средней ближе.
  const road = bestBig <= 300 ? { m: bestBig, cls: 'big' as const }
    : bestMid < Infinity || bestBig < Infinity ? (bestMid <= bestBig ? { m: bestMid, cls: 'mid' as const } : { m: bestBig, cls: 'big' as const })
    : null

  let mosque = Infinity
  for (const [mlat, mlng] of osm.mosques) {
    if (Math.abs(mlat - lat) > 0.006 || Math.abs(mlng - lng) > 0.006) continue
    mosque = Math.min(mosque, Math.hypot(...toXY(mlat, mlng, lat).map((v, i) => v - p[i]) as [number, number]))
  }

  // Самолёты: полоса 09/27 и продолжение её оси на 6 км в обе стороны
  // (коридор захода на посадку, ±1 км в стороны).
  const [r1, r2] = osm.runway.map(([a, b]) => toXY(a, b, lat)) as [[number, number], [number, number]]
  const dRunway = segDist(p, r1, r2)
  const ux = (r2[0] - r1[0]), uy = (r2[1] - r1[1]), L = Math.hypot(ux, uy)
  const along = ((p[0] - r1[0]) * ux + (p[1] - r1[1]) * uy) / L
  const across = Math.abs(((p[0] - r1[0]) * uy - (p[1] - r1[1]) * ux) / L)
  const flight: GeoNoise['flight'] = dRunway <= 2500 ? 'near'
    : across <= 1000 && along >= -6000 && along <= L + 6000 ? 'path' : null

  let volcano: GeoNoise['volcano'] = null, volcanoKm: number | null = null
  for (const v of VOLCANOES) {
    const km = Math.hypot(...toXY(v.lat, v.lng, lat).map((x, i) => x - p[i]) as [number, number]) / 1000
    if (km <= VOLCANO_SHOW_KM && (volcanoKm == null || km < volcanoKm)) { volcano = v.key; volcanoKm = Math.round(km * 10) / 10 }
  }

  return {
    road_m: road && road.m < 5000 ? Math.round(road.m) : null,
    road_class: road && road.m < 5000 ? road.cls : null,
    mosque_m: mosque <= 500 ? Math.round(mosque) : null,
    flight,
    volcano,
    volcano_km: volcanoKm,
  }
}
