import type { NearbyPlace } from '../nearby-places'

export type InfraMetrics = {
  premiumRestaurants: number
  beachClubs: number
  topCafes: number
  fitness: number
  nightclubs: number
  avgRating: number | null
  reviewDensity: number
  totalAnchors: number
}

export type InfraScore = {
  metrics: InfraMetrics
  composite: number
  anchors: NearbyPlace[]
}

const PRICE_HIGH = new Set(['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'])
// Composite score stays tight — 800 m walking radius reflects "this villa's
// immediate infra quality". Anchor selection for the map uses a wider 1.5 km
// because Pererenan/Canggu spread good restaurants along arterial streets and
// the 800 m cutoff routinely nukes obvious crowd-favourites.
const RADIUS_KM = 0.8
const ANCHOR_RADIUS_KM = 1.5

function hasType(p: NearbyPlace, t: string): boolean {
  return p.types?.includes(t) || p.primaryType === t
}
function isBeachClub(p: NearbyPlace): boolean {
  if (!p.name) return false
  return /beach club|beachclub/i.test(p.name)
}

export function scoreInfra(byCategory: Record<string, NearbyPlace[]>): InfraScore {
  const all = Object.values(byCategory).flat()
  const within = all.filter(p => p.distanceKm <= RADIUS_KM)

  const restaurants = (byCategory.restaurant ?? []).filter(p => p.distanceKm <= RADIUS_KM)
  const cafes = (byCategory.cafe ?? []).filter(p => p.distanceKm <= RADIUS_KM)
  const nightlife = (byCategory.nightlife ?? []).filter(p => p.distanceKm <= RADIUS_KM)
  const attractions = (byCategory.attraction ?? []).filter(p => p.distanceKm <= RADIUS_KM)
  const wellness = (byCategory.wellness ?? []).filter(p => p.distanceKm <= RADIUS_KM)
  const beachClubsList = (byCategory.beachclub ?? []).filter(p => p.distanceKm <= 1.2)

  // Премиум по priceLevel ИЛИ по rating>=4.6 + reviews>=100 (priceLevel у большинства Bali-ресторанов не проставлен).
  // Composite score keeps the tight isNotable. Anchor selection below uses
  // isAnchorWorthy, which additionally accepts crowd-favourites
  // (rating>=4.4 + 300+ reviews) — these are the «кайфовые» places users
  // expect to see pinned on the map even if they aren't priceLevel-premium.
  const isNotable = (p: NearbyPlace): boolean =>
    (p.priceLevel != null && PRICE_HIGH.has(p.priceLevel) && (p.rating ?? 0) >= 4.3) ||
    ((p.rating ?? 0) >= 4.6 && (p.reviews ?? 0) >= 100)
  const isAnchorWorthy = (p: NearbyPlace): boolean =>
    isNotable(p) || ((p.rating ?? 0) >= 4.4 && (p.reviews ?? 0) >= 300)
  const premiumRestaurants = restaurants.filter(isNotable).length
  const beachClubs = beachClubsList.length || nightlife.filter(isBeachClub).length
  const topCafes = cafes.filter(p => (p.rating ?? 0) >= 4.5).length
  const fitness = wellness.length || within.filter(p => /yoga|fitness|gym|wellness|spa/i.test(p.name ?? '') || hasType(p, 'gym')).length
  const nightclubs = nightlife.filter(p => hasType(p, 'night_club')).length

  const ratings = within.map(p => p.rating).filter((r): r is number => r != null)
  const avgRating = ratings.length ? Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) / 10 : null
  const reviewSum = within.reduce((s, p) => s + (p.reviews ?? 0), 0)
  const reviewDensity = within.length ? Math.round(reviewSum / within.length) : 0

  // Composite 0-100
  const r = Math.min(1, premiumRestaurants / 8) * 25
  const bc = Math.min(1, beachClubs / 3) * 20
  const cf = Math.min(1, topCafes / 5) * 15
  const ft = Math.min(1, fitness / 5) * 10
  const nc = Math.min(1, nightclubs / 3) * 10
  const ar = avgRating ? Math.max(0, Math.min(1, (avgRating - 3.8) / (4.8 - 3.8))) * 10 : 0
  const rd = Math.min(1, reviewDensity / 800) * 10
  const composite = Math.round(r + bc + cf + ft + nc + ar + rd)

  const restaurantsForAnchors = (byCategory.restaurant ?? []).filter(p => p.distanceKm <= ANCHOR_RADIUS_KM)
  const beachClubsForAnchors = (byCategory.beachclub ?? []).filter(p => p.distanceKm <= ANCHOR_RADIUS_KM)
  const attractionsForAnchors = (byCategory.attraction ?? []).filter(p => p.distanceKm <= ANCHOR_RADIUS_KM)
  const anchors: NearbyPlace[] = [
    ...(byCategory.beach ?? []).slice(0, 1),
    ...restaurantsForAnchors.filter(isAnchorWorthy).slice(0, 8),
    ...beachClubsForAnchors.filter(p => (p.rating ?? 0) >= 4.3).slice(0, 4),
    ...attractionsForAnchors.filter(p => (p.rating ?? 0) >= 4.5).slice(0, 3),
  ]

  return {
    metrics: { premiumRestaurants, beachClubs, topCafes, fitness, nightclubs, avgRating, reviewDensity, totalAnchors: anchors.length },
    composite,
    anchors,
  }
}
