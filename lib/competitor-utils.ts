export type Competitor = {
  id: string
  name: string
  complex: string | null
  address: string | null
  lat: number
  lng: number
  price: number
  bedrooms: number | null
  area: number | null
  pool: string | null
  view: string | null
  rating: number | null
  reviews: number | null
  photo: string | null
  url: string | null
  date: string | null
}

export type CompetitorWithDistance = Competitor & { distanceKm: number }

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export type CompetitorGroup = {
  id: string
  lat: number
  lng: number
  address: string | null
  complex: string | null
  rating: number | null
  reviews: number | null
  photo: string | null
  url: string | null
  distanceKm: number
  units: CompetitorWithDistance[]
  unitCount: number
  priceMin: number
  priceMax: number
  priceMedian: number
  bedroomsRange: { min: number | null; max: number | null }
}

export function groupByLocation(items: CompetitorWithDistance[]): CompetitorGroup[] {
  const buckets = new Map<string, CompetitorWithDistance[]>()
  for (const c of items) {
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`
    const arr = buckets.get(key) ?? []
    arr.push(c)
    buckets.set(key, arr)
  }
  const out: CompetitorGroup[] = []
  for (const [key, group] of buckets) {
    if (group.length === 0) continue
    const anchor = group.reduce((best, c) => {
      const score = (c.photo ? 4 : 0) + (c.rating != null ? 2 : 0) + (c.complex ? 1 : 0)
      const bestScore = (best.photo ? 4 : 0) + (best.rating != null ? 2 : 0) + (best.complex ? 1 : 0)
      return score > bestScore ? c : best
    }, group[0])
    const prices = group.map(g => g.price)
    const beds = group.map(g => g.bedrooms).filter((b): b is number => b != null)
    out.push({
      id: key,
      lat: anchor.lat,
      lng: anchor.lng,
      address: anchor.address,
      complex: anchor.complex,
      rating: anchor.rating,
      reviews: anchor.reviews,
      photo: anchor.photo,
      url: anchor.url,
      distanceKm: Math.min(...group.map(g => g.distanceKm)),
      units: group.sort((a, b) => a.price - b.price),
      unitCount: group.length,
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),
      priceMedian: Math.round(median(prices)),
      bedroomsRange: { min: beds.length ? Math.min(...beds) : null, max: beds.length ? Math.max(...beds) : null },
    })
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm)
}

export type CompetitorStats = {
  count: number
  byBedrooms: Array<{
    bedrooms: number | null
    label: string
    count: number
    median: number
    min: number
    max: number
  }>
  overall: { median: number; min: number; max: number; avg: number }
}

export function summarize(items: Competitor[]): CompetitorStats {
  const groups = new Map<string, { bedrooms: number | null; prices: number[] }>()
  for (const c of items) {
    const key = c.bedrooms == null ? 'na' : String(c.bedrooms)
    const g = groups.get(key) ?? { bedrooms: c.bedrooms, prices: [] }
    g.prices.push(c.price)
    groups.set(key, g)
  }
  const byBedrooms = [...groups.values()]
    .filter(g => g.prices.length >= 2 && g.bedrooms !== 0)
    .map(g => {
      const min = Math.min(...g.prices)
      const max = Math.max(...g.prices)
      return {
        bedrooms: g.bedrooms,
        label: g.bedrooms == null ? 'Без указания' : `${g.bedrooms} BR`,
        count: g.prices.length,
        median: Math.round(median(g.prices)),
        min,
        max,
      }
    })
    .sort((a, b) => (a.bedrooms ?? 99) - (b.bedrooms ?? 99))

  const all = items.map(i => i.price)
  const overall = {
    median: Math.round(median(all)),
    min: all.length ? Math.min(...all) : 0,
    max: all.length ? Math.max(...all) : 0,
    avg: all.length ? Math.round(all.reduce((s, v) => s + v, 0) / all.length) : 0,
  }
  return { count: items.length, byBedrooms, overall }
}

export type SimilarStats = {
  count: number
  median: number
  avg: number
  min: number
  max: number
  matchedByArea: boolean
}

export function summarizeSimilar(
  items: Competitor[],
  villa: { bedrooms: number | null; area: number | null },
): SimilarStats | null {
  const matches = items.filter(c => {
    if (villa.bedrooms != null && c.bedrooms !== villa.bedrooms) return false
    if (villa.area != null && c.area != null) {
      const lo = villa.area * 0.7, hi = villa.area * 1.3
      if (c.area < lo || c.area > hi) return false
    }
    return true
  })
  if (matches.length === 0) return null
  const prices = matches.map(c => c.price)
  return {
    count: matches.length,
    median: Math.round(median(prices)),
    avg: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length),
    min: Math.min(...prices),
    max: Math.max(...prices),
    matchedByArea: villa.area != null && matches.some(c => c.area != null),
  }
}
