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
// Anchors on the investment map answer: "what makes this address valuable
// to a buyer or a long-stay tenant?" — not "what's popular nearby." So we
// hard-filter out the things investors don't care about:
//
//   - global fast-food chains (McDonald's, KFC) — high review counts but
//     zero signal about neighbourhood quality
//   - generic warungs and local eateries (tourist popularity ≠ premium)
//   - mosques / temples and other civic non-amenities
//   - bare-bones local clinics
//
// and we promote categories that drive rental yield + resale value:
//   - international hospitals (BIMC, Siloam, Kasih Ibu, ...)
//   - shopping malls (Icon Bali, Beachwalk, Lippo, Discovery)
//   - international schools
//   - coworking spaces (digital-nomad rental demand)
//   - ferry terminals / harbours (Sanur → Nusa Penida etc)
//   - genuine fine-dining (priceLevel high OR rating 4.7 with 500+ reviews)
function isJunkChain(p: NearbyPlace): boolean {
  if (hasType(p, 'fast_food_restaurant')) return true
  if (!p.name) return false
  return /\b(mcdonald|kfc|starbucks|burger king|pizza hut|dunkin|domino|subway|wendy)/i.test(p.name)
}
function isFineDining(p: NearbyPlace): boolean {
  if (isJunkChain(p)) return false
  if (hasType(p, 'fine_dining_restaurant')) return (p.rating ?? 0) >= 4.4
  if (p.priceLevel != null && PRICE_HIGH.has(p.priceLevel) && (p.rating ?? 0) >= 4.4) return true
  // Stricter than the old isNotable — 4.7 + 500 reviews is "Bali institution"
  // territory, not "popular warung." Keeps Naughty Nuri's / Mason / La Brisa,
  // drops Warung Mak Beng / Soul on the Beach.
  return (p.rating ?? 0) >= 4.7 && (p.reviews ?? 0) >= 500
}
function isPremiumHospital(p: NearbyPlace): boolean {
  if (!p.name) return false
  const n = p.name
  // Whitelist of names a relocating expat actually recognises. Local
  // clinics, dental offices, and `Klinik Sanur`-style street practices
  // don't make this list even if their Google rating is 5★ × 4 reviews.
  return /bimc|siloam|kasih ibu|prima medika|royal hospital|bali international|international hospital|sapporo cardio/i.test(n)
    && (p.rating ?? 0) >= 3.8
}
function isReligiousOrCivic(p: NearbyPlace): boolean {
  if (hasType(p, 'mosque') || hasType(p, 'church')) return true
  if (!p.name) return false
  return /\b(masjid|mosque|church|gereja|cathedral)\b/i.test(p.name)
}
function isMall(p: NearbyPlace): boolean {
  return hasType(p, 'shopping_mall') || hasType(p, 'department_store')
}
function isFerry(p: NearbyPlace): boolean {
  return hasType(p, 'ferry_terminal')
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

  // Composite-score restaurant gate (kept loose for the 0-100 number) —
  // the anchor map uses the much tighter isFineDining above.
  const isNotable = (p: NearbyPlace): boolean =>
    !isJunkChain(p) && (
      (p.priceLevel != null && PRICE_HIGH.has(p.priceLevel) && (p.rating ?? 0) >= 4.3) ||
      ((p.rating ?? 0) >= 4.6 && (p.reviews ?? 0) >= 100)
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
  const fineDining = withinAnchorRadius(byCategory.restaurant).filter(isFineDining)
  const premiumBeachClubs = withinAnchorRadius(byCategory.beachclub)
    .filter(p => (p.rating ?? 0) >= 4.6 && (p.reviews ?? 0) >= 500)
  // Attractions: real landmarks only (1000+ reviews, 4.3+ rating, not a
  // mosque/church). The 4.5 rating threshold by itself misses Sanur
  // Harbour but lets Masjid Al-Ihsaan in — the opposite of what we want.
  const realLandmarks = withinAnchorRadius(byCategory.attraction)
    .filter(p => !isReligiousOrCivic(p))
    .filter(p =>
      ((p.rating ?? 0) >= 4.5 && (p.reviews ?? 0) >= 500) ||
      ((p.rating ?? 0) >= 4.3 && (p.reviews ?? 0) >= 1000)
    )
  const malls = withinAnchorRadius(byCategory.shopping_mall).filter(isMall)
  const ferries = withinAnchorRadius(byCategory.ferry_terminal).filter(isFerry)
  const internationalSchools = withinAnchorRadius(byCategory.international_school)
    .filter(p => (p.rating ?? 0) >= 4.0)
  const coworkings = withinAnchorRadius(byCategory.coworking)
    .filter(p => (p.rating ?? 0) >= 4.4)
  const internationalHospitals = withinAnchorRadius(byCategory.hospital).filter(isPremiumHospital)

  const seen = new Set<string>()
  const dedup = (p: NearbyPlace) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  }
  // Order matters — earlier entries claim ids first, later ones skip dupes.
  // Mix is biased toward infrastructure that drives investment value, not
  // gastronomy popularity: 3 hospitals/malls/ferries/schools combined,
  // then a handful of premium F&B, then real landmarks.
  const anchors: NearbyPlace[] = [
    ...(byCategory.beach ?? []).slice(0, 1).filter(dedup),
    ...internationalHospitals.slice(0, 2).filter(dedup),
    ...malls.slice(0, 2).filter(dedup),
    ...ferries.slice(0, 1).filter(dedup),
    ...internationalSchools.slice(0, 2).filter(dedup),
    ...coworkings.slice(0, 2).filter(dedup),
    ...premiumBeachClubs.slice(0, 3).filter(dedup),
    ...fineDining.slice(0, 4).filter(dedup),
    ...realLandmarks.slice(0, 2).filter(dedup),
  ]

  return {
    metrics: { premiumRestaurants, beachClubs, topCafes, fitness, nightclubs, avgRating, reviewDensity, totalAnchors: anchors.length },
    composite,
    anchors,
  }
}
