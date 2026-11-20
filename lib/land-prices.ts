// Цены на землю рядом с виллой — медиана $/м² по участкам в радиусе.
// Данные — Storage rental/land_comps/ (scripts/build-land-comps.ts).

import { cdnManifestUrl } from './photo-cdn'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const BASE = `${SUPABASE_URL}/storage/v1/object/public/rental/land_comps`
const TTL_MS = 60 * 60 * 1000

type RawLand = [number, number, number, number, 0 | 1 | null, number | null, string, string | null]
type Index = { generatedAt: string; tile: number; tiles: Record<string, number> }

export type LandPriceBundle = {
  medianPpm: number
  n: number
  radiusKm: number
  p25: number
  p75: number
  method: 'leasehold' | 'freehold_adjusted'
  /** Участки, по которым посчитана медиана (ближние первыми) — для ленты в «Аналитике». */
  comps?: { lat: number; lng: number; priceUsd: number; landM2: number; ppm: number; url: string; district: string | null; distanceKm: number }[]
  /** Сколько участков всего в соседних клетках (до фильтра по радиусу). */
  scanned?: number
}

let _index: { ts: number; data: Index | null } | null = null
const _tiles = new Map<string, { ts: number; data: RawLand[] }>()

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

async function loadTile(key: string): Promise<RawLand[]> {
  const hit = _tiles.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data
  try {
    const r = await fetch(cdnManifestUrl(`${BASE}/${key}.json`, 3600))
    const data = r.ok ? (await r.json()) as RawLand[] : []
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

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function quantile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))]
}

function compsOf(rows: RawLand[], lat: number, lng: number, k: number): NonNullable<LandPriceBundle['comps']> {
  return rows
    .map(r => ({ lat: r[0], lng: r[1], priceUsd: r[2], landM2: r[3], ppm: (r[2] / r[3]) * k, url: r[6], district: r[7], distanceKm: km(lat, lng, r[0], r[1]) }))
    .filter(c => c.ppm >= 10 * k && c.ppm <= 5000 * k)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 40)
}

const RADII_KM = [2, 3, 5] as const
const MIN_PLOTS = 5
const FREEHOLD_TO_LEASEHOLD = 0.35

export async function landPricesNear(lat: number, lng: number): Promise<LandPriceBundle | null> {
  const idx = await loadIndex()
  if (!idx) return null

  const keys: string[] = []
  const ty = Math.floor(lat / idx.tile), tx = Math.floor(lng / idx.tile)
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const k = `${ty + dy}_${tx + dx}`
    if (idx.tiles[k]) keys.push(k)
  }
  const raw = (await Promise.all(keys.map(loadTile))).flat()

  // 1) leasehold plots — direct comparison
  for (const radius of RADII_KM) {
    const nearby = raw.filter(r => km(lat, lng, r[0], r[1]) <= radius && r[4] === 1)
    const ppms = nearby.map(r => r[2] / r[3]).filter(v => v >= 10 && v <= 5000)
    if (ppms.length >= MIN_PLOTS) {
      return {
        comps: compsOf(nearby, lat, lng, 1), scanned: raw.length,
        medianPpm: Math.round(median(ppms)),
        n: ppms.length,
        radiusKm: radius,
        p25: Math.round(quantile(ppms, 0.25)),
        p75: Math.round(quantile(ppms, 0.75)),
        method: 'leasehold',
      }
    }
  }

  // 2) freehold plots × 0.35 coefficient
  for (const radius of RADII_KM) {
    const nearby = raw.filter(r => km(lat, lng, r[0], r[1]) <= radius && r[4] === 0)
    const ppms = nearby.map(r => r[2] / r[3]).filter(v => v >= 10 && v <= 5000)
    if (ppms.length >= MIN_PLOTS) {
      return {
        comps: compsOf(nearby, lat, lng, FREEHOLD_TO_LEASEHOLD), scanned: raw.length,
        medianPpm: Math.round(median(ppms) * FREEHOLD_TO_LEASEHOLD),
        n: ppms.length,
        radiusKm: radius,
        p25: Math.round(quantile(ppms, 0.25) * FREEHOLD_TO_LEASEHOLD),
        p75: Math.round(quantile(ppms, 0.75) * FREEHOLD_TO_LEASEHOLD),
        method: 'freehold_adjusted',
      }
    }
  }

  return null
}
