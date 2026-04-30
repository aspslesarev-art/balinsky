import {
  type Competitor,
  type CompetitorWithDistance,
  distanceKm,
} from '../competitor-utils'
import {
  type BeachZone,
  classifyZone,
  expandZone,
} from './zones'
import type { NearbyPlace } from '../nearby-places'

export type MatchMode = 'standard' | 'reduced' | 'references'

export type MatchTarget = {
  lat: number
  lng: number
  bedrooms: number | null
  area: number | null
  hasPool: boolean | null
}

export type MatchResult = {
  matches: CompetitorWithDistance[]
  appliedZone: BeachZone
  expanded: boolean
  mode: MatchMode
  rawZone: BeachZone
  isLuxury: boolean
}

const MAX_RADIUS_KM = 2

function competitorBeachZoneMatches(competitor: CompetitorWithDistance, beaches: NearbyPlace[], targetZone: BeachZone): boolean {
  // Approx: a competitor is in the target zone if its nearest beach is in same zone bucket.
  // We don't have per-competitor beach data, so we approximate by distance from villa zone radius.
  // Acceptable since matches are within 2km — the same beach is usually closest.
  if (beaches.length === 0) return targetZone === 'inland'
  const closestBeach = beaches[0]
  const compDistToBeachKm = distanceKm(competitor.lat, competitor.lng, closestBeach.lat, closestBeach.lng)
  const m = compDistToBeachKm * 1000 * 1.3
  if (targetZone === 'beachfront') return m <= 150
  if (targetZone === 'walking') return m <= 600
  if (targetZone === 'scooter') return m <= 1700
  return true
}

function poolMatches(target: MatchTarget, c: Competitor): boolean {
  if (target.hasPool == null || target.hasPool === false) return true
  // target has pool — competitor should have pool indication
  if (!c.pool) return false
  return /бассейн|pool/i.test(c.pool)
}

export function matchCompetitors(
  competitors: CompetitorWithDistance[],
  target: MatchTarget,
  beaches: NearbyPlace[],
): MatchResult {
  const isLuxury = (target.bedrooms ?? 0) >= 5
  const inRadius = competitors.filter(c => c.distanceKm <= MAX_RADIUS_KM)
  const { zone: rawZone } = classifyZone(beaches)

  function applyFilters(zone: BeachZone, useZone: boolean): CompetitorWithDistance[] {
    return inRadius.filter(c => {
      if (target.bedrooms != null && c.bedrooms != null) {
        if (Math.abs(c.bedrooms - target.bedrooms) > 1) return false
      }
      if (target.area != null && c.area != null) {
        const lo = target.area * 0.75, hi = target.area * 1.25
        if (c.area < lo || c.area > hi) return false
      }
      if (!poolMatches(target, c)) return false
      if (useZone && !competitorBeachZoneMatches(c, beaches, zone)) return false
      return true
    })
  }

  let appliedZone = rawZone
  let expanded = false
  let matches: CompetitorWithDistance[]

  if (isLuxury) {
    // Luxury: don't constrain by zone
    matches = applyFilters(rawZone, false)
  } else {
    matches = applyFilters(rawZone, true)
    let next: BeachZone | null = rawZone
    while (matches.length === 0 && (next = expandZone(next!))) {
      const expandedMatches = applyFilters(next, true)
      if (expandedMatches.length > 0) {
        matches = expandedMatches
        appliedZone = next
        expanded = true
        break
      }
    }
  }

  // Дедуп: один и тот же Booking-объект может прилетать несколько раз
  // (разные даты сбора). Ключ: URL > complex|name|price|bedrooms.
  const seen = new Map<string, CompetitorWithDistance>()
  for (const c of matches) {
    const key = c.url
      ? `u:${c.url}`
      : `n:${c.complex ?? ''}|${c.name ?? ''}|${c.price}|${c.bedrooms ?? ''}`
    const prev = seen.get(key)
    if (!prev) { seen.set(key, c); continue }
    // Предпочитаем запись с фото, потом с более свежей датой, потом большим числом отзывов
    const score = (x: CompetitorWithDistance) =>
      (x.photo ? 4 : 0) + (x.date ? 2 : 0) + (x.reviews ?? 0) / 1000
    if (score(c) > score(prev)) seen.set(key, c)
  }
  matches = [...seen.values()]

  // Sort by distance
  matches.sort((a, b) => a.distanceKm - b.distanceKm)

  let mode: MatchMode
  if (matches.length >= 12) mode = 'standard'
  else if (matches.length >= 5) mode = 'reduced'
  else mode = 'references'

  return { matches, appliedZone, expanded, mode, rawZone, isLuxury }
}
