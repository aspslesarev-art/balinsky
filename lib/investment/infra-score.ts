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
// Fast-food and global chains hijack "crowd-favourite" filters: a Bali
// McDonald's has 12 000 reviews because every tourist stops there at 2 AM,
// not because it's a worthwhile destination. Drop them from anchors.
function isJunkChain(p: NearbyPlace): boolean {
  if (hasType(p, 'fast_food_restaurant')) return true
  if (!p.name) return false
  return /\b(mcdonald|kfc|starbucks|burger king|pizza hut|dunkin|domino|subway|wendy)/i.test(p.name)
}
// International / serious medical centres a buyer/tenant actually cares about.
// Heuristic: name signals "international", "BIMC", "bali international",
// "international hospital", or a strict score gate.
function isPremiumHospital(p: NearbyPlace): boolean {
  if (!p.name) return false
  const n = p.name
  if (/bimc|international|internasional|bali (international|royal)|kasih ibu|prima medika|siloam|silloam/i.test(n)) {
    return (p.rating ?? 0) >= 4.0
  }
  return (p.rating ?? 0) >= 4.5 && (p.reviews ?? 0) >= 200
}
// Shopping malls / large retail. Until the sync layer queries `shopping_mall`
// type directly, we match by name as a stopgap so Icon Bali Mall et al. get
// pinned on the map.
function looksLikeMall(p: NearbyPlace): boolean {
  if (!p.name) return false
  return /\b(mall|plaza|shopping center|shopping centre|department store)\b/i.test(p.name)
    || hasType(p, 'shopping_mall')
}
// Ferries / harbours (Sanur → Nusa Penida etc).
function looksLikeFerry(p: NearbyPlace): boolean {
  if (!p.name) return false
  return /harbour|harbor|ferry|pelabuhan|terminal/i.test(p.name) || hasType(p, 'ferry_terminal')
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
  // (rating>=4.4 + 600+ reviews) — these are the «кайфовые» places users
  // expect to see pinned on the map even if they aren't priceLevel-premium.
  // We exclude fast-food chains (McDonald's, KFC) — they game the review
  // count without being worth surfacing.
  const isNotable = (p: NearbyPlace): boolean =>
    !isJunkChain(p) && (
      (p.priceLevel != null && PRICE_HIGH.has(p.priceLevel) && (p.rating ?? 0) >= 4.3) ||
      ((p.rating ?? 0) >= 4.6 && (p.reviews ?? 0) >= 100)
    )
  const isAnchorWorthy = (p: NearbyPlace): boolean =>
    !isJunkChain(p) && (
      isNotable(p) || ((p.rating ?? 0) >= 4.4 && (p.reviews ?? 0) >= 600)
    )
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

  const withinAnchorRadius = (list: NearbyPlace[] | undefined) =>
    (list ?? []).filter(p => p.distanceKm <= ANCHOR_RADIUS_KM)
  const restaurantsForAnchors = withinAnchorRadius(byCategory.restaurant)
  const beachClubsForAnchors = withinAnchorRadius(byCategory.beachclub)
  const attractionsForAnchors = withinAnchorRadius(byCategory.attraction)
  const hospitalsForAnchors = withinAnchorRadius(byCategory.hospital)
  // Attractions: drop the 4.5-rating wall — Sanur Harbour (4.3 ★ × 7600) is
  // a real anchor users want to see. Anything with 1000+ reviews and 4.3+
  // is a known landmark.
  const notableAttractions = attractionsForAnchors.filter(p =>
    ((p.rating ?? 0) >= 4.5) ||
    ((p.rating ?? 0) >= 4.3 && (p.reviews ?? 0) >= 1000)
  )
  // Ferries / malls hide inside other categories (attraction, beachclub, ...)
  // until the sync gets dedicated includedTypes. Scrape them out by name.
  const malls = Object.values(byCategory).flat()
    .filter(p => p.distanceKm <= ANCHOR_RADIUS_KM && looksLikeMall(p))
  const ferries = Object.values(byCategory).flat()
    .filter(p => p.distanceKm <= ANCHOR_RADIUS_KM && looksLikeFerry(p))
  const premiumHospitals = hospitalsForAnchors.filter(isPremiumHospital)

  const seen = new Set<string>()
  const dedup = (p: NearbyPlace) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  }
  const anchors: NearbyPlace[] = [
    ...(byCategory.beach ?? []).slice(0, 1).filter(dedup),
    ...restaurantsForAnchors.filter(isAnchorWorthy).slice(0, 6).filter(dedup),
    ...beachClubsForAnchors.filter(p => (p.rating ?? 0) >= 4.3).slice(0, 4).filter(dedup),
    ...notableAttractions.slice(0, 3).filter(dedup),
    ...malls.slice(0, 2).filter(dedup),
    ...ferries.slice(0, 1).filter(dedup),
    ...premiumHospitals.slice(0, 2).filter(dedup),
  ]

  return {
    metrics: { premiumRestaurants, beachClubs, topCafes, fitness, nightclubs, avgRating, reviewDensity, totalAnchors: anchors.length },
    composite,
    anchors,
  }
}
