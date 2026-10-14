// Похожие виллы на продаже вокруг объекта — для блока «Что продаётся рядом».
//
// Данные — объявления rumah123.com (scripts/build-sale-comps.ts →
// Storage rental/sale_comps/: квадраты 0.05° и оглавление). Точки у части
// объявлений — центр района, поэтому радиус берём лесенкой.
//
// Сравнение честное только при одинаковом праве: лизхолд сравниваем с
// лизхолдом и по цене за м² на ГОД владения — сроки бывают от 20 до 80 лет,
// и вилла на 25 лет при той же цене за м² вдвое дороже виллы на 50.

import { cdnManifestUrl } from './photo-cdn'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const BASE = `${SUPABASE_URL}/storage/v1/object/public/rental/sale_comps`
const TTL_MS = 60 * 60 * 1000

const RADII_KM = [1, 2, 3, 5] as const
/** Меньше — медиане не верим и вывод «дороже/дешевле» не делаем. */
export const MIN_FOR_VERDICT = 5
/** Меньше — это ориентир, а не рыночная цифра. */
export const SOLID_N = 30
const SHOW = 6

type RawItem = [number, number, number, number, number | null, number | null, 0 | 1 | null, number | null, string | null, string, string | null, string | null]
type Index = {
  generatedAt: string; asOf: string | null; source: string
  urlBase: string; photoBase: string; tile: number; tiles: Record<string, number>
}

export type SaleComp = {
  bedrooms: number
  priceUsd: number
  buildingM2: number | null
  landM2: number | null
  leasehold: boolean | null
  leaseYears: number | null
  posted: string | null
  url: string
  photo: string | null
  district: string | null
  distanceKm: number
  /** Цена за м²; для лизхолда со сроком — ещё и за м² на год. */
  ppm: number | null
  ppmYear: number | null
}

export type SaleCompsBundle = {
  /** 'year' — сравниваем $/м² на год лизхолда, 'm2' — просто $/м². */
  metric: 'year' | 'm2'
  median: number | null
  self: number | null
  /** На сколько процентов объект дороже (+) или дешевле (−) медианы. */
  diffPct: number | null
  /** Сколько объявлений в сравнении. */
  n: number
  radiusKm: number
  bedroomsRelaxed: boolean
  comps: SaleComp[]
  source: string
  asOf: string
}

let _index: { ts: number; data: Index | null } | null = null
const _tiles = new Map<string, { ts: number; data: RawItem[] }>()

async function loadIndex(): Promise<Index | null> {
  if (_index && Date.now() - _index.ts < TTL_MS) return _index.data
  try {
    const r = await fetch(cdnManifestUrl(`${BASE}/_index.json`, 3600))
    const data = r.ok ? (await r.json()) as Index : null
    _index = { ts: Date.now(), data }
    return data
  } catch {
    return _index?.data ?? null
  }
}

async function loadTile(key: string): Promise<RawItem[]> {
  const hit = _tiles.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data
  try {
    const r = await fetch(cdnManifestUrl(`${BASE}/${key}.json`, 3600))
    const data = r.ok ? (await r.json()) as RawItem[] : []
    _tiles.set(key, { ts: Date.now(), data })
    return data
  } catch {
    return hit?.data ?? []
  }
}

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLng = (bLng - aLng) * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export type SaleCompsInput = {
  lat: number
  lng: number
  bedrooms: number | null
  areaM2: number | null
  priceUsd: number | null
  /** Срок лизхолда в годах; null — фрихолд или не указан. */
  leaseYears: number | null
}

export async function saleCompsNear(i: SaleCompsInput): Promise<SaleCompsBundle | null> {
  const idx = await loadIndex()
  if (!idx) return null
  const ty = Math.floor(i.lat / idx.tile), tx = Math.floor(i.lng / idx.tile)
  const keys: string[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const k = `${ty + dy}_${tx + dx}`
    if (idx.tiles[k]) keys.push(k)
  }
  if (!keys.length) return null
  const raw = (await Promise.all(keys.map(loadTile))).flat()

  const all: SaleComp[] = raw.map(r => {
    const [lat, lng, bedrooms, priceUsd, buildingM2, landM2, tenure, leaseYears, posted, url, photo, district] = r
    const ppm = buildingM2 ? priceUsd / buildingM2 : null
    return {
      bedrooms, priceUsd, buildingM2, landM2,
      leasehold: tenure == null ? null : tenure === 1,
      leaseYears, posted, url: idx.urlBase + url,
      photo: photo ? idx.photoBase + photo : null,
      district, distanceKm: km(i.lat, i.lng, lat, lng),
      ppm, ppmYear: ppm != null && leaseYears ? ppm / leaseYears : null,
    }
  })

  const beds = i.bedrooms ?? 2
  const isLease = i.leaseYears != null
  // Лизхолд — только лизхолд со сроком (иначе не сравнить), фрихолд — всё,
  // что не лизхолд. Площадь — в пределах ×0.5…×2 от своей.
  const sameRight = (c: SaleComp) => isLease ? c.ppmYear != null : c.leasehold !== true
  const sameSize = (c: SaleComp) => !i.areaM2 || !c.buildingM2 || (c.buildingM2 >= i.areaM2 / 2 && c.buildingM2 <= i.areaM2 * 2)
  const pick = (radius: number, relaxed: boolean) => all.filter(c =>
    c.distanceKm <= radius && sameRight(c) && sameSize(c) &&
    (relaxed ? Math.abs(c.bedrooms - beds) <= 1 : c.bedrooms === beds))

  let chosen: SaleComp[] = []
  let radiusKm: number = RADII_KM[0]
  let relaxed = false
  for (const r of RADII_KM) {
    chosen = pick(r, false); radiusKm = r
    if (chosen.length >= MIN_FOR_VERDICT) break
  }
  if (chosen.length < MIN_FOR_VERDICT) {
    const wider = pick(RADII_KM[RADII_KM.length - 1], true)
    if (wider.length > chosen.length) { chosen = wider; relaxed = true }
  }
  if (!chosen.length) return null

  const metric = isLease ? 'year' : 'm2'
  const val = (c: SaleComp) => metric === 'year' ? c.ppmYear : c.ppm
  const vals = chosen.map(val).filter((v): v is number => v != null)
  const med = vals.length >= MIN_FOR_VERDICT ? median(vals) : null
  const selfPpm = i.priceUsd && i.areaM2 ? i.priceUsd / i.areaM2 : null
  const self = selfPpm == null ? null : metric === 'year' ? selfPpm / i.leaseYears! : selfPpm
  const diffPct = med && self ? Math.round((self / med - 1) * 100) : null

  // Карточки: сначала с фото и площадью, ближние — выше.
  const comps = [...chosen]
    .sort((a, b) => Number(!!b.photo && !!b.buildingM2) - Number(!!a.photo && !!a.buildingM2) || a.distanceKm - b.distanceKm)
    .slice(0, SHOW)

  return {
    metric, median: med, self, diffPct,
    n: chosen.length, radiusKm, bedroomsRelaxed: relaxed, comps,
    source: idx.source, asOf: idx.asOf ?? idx.generatedAt,
  }
}
