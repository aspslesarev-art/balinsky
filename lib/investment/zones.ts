import type { NearbyPlace } from '../nearby-places'

export type BeachZone = 'beachfront' | 'walking' | 'scooter' | 'inland'

export type ZoneInfo = {
  zone: BeachZone
  nearestBeach: NearbyPlace | null
  walkingMeters: number | null
}

const HAVERSINE_TO_WALK = 1.3

export function classifyZone(beaches: NearbyPlace[]): ZoneInfo {
  if (beaches.length === 0) return { zone: 'inland', nearestBeach: null, walkingMeters: null }
  const sorted = [...beaches].sort((a, b) => a.distanceKm - b.distanceKm)
  const nearest = sorted[0]
  const walkingMeters = Math.round(nearest.distanceKm * 1000 * HAVERSINE_TO_WALK)
  let zone: BeachZone
  if (walkingMeters <= 100) zone = 'beachfront'
  else if (walkingMeters <= 500) zone = 'walking'
  else if (walkingMeters <= 1500) zone = 'scooter'
  else zone = 'inland'
  return { zone, nearestBeach: nearest, walkingMeters }
}

export function expandZone(z: BeachZone): BeachZone | null {
  if (z === 'beachfront') return 'walking'
  if (z === 'walking') return 'scooter'
  if (z === 'scooter') return 'inland'
  return null
}

export function zoneRadiusMeters(z: BeachZone): number {
  if (z === 'beachfront') return 100
  if (z === 'walking') return 500
  if (z === 'scooter') return 1500
  return 99999
}

export function zoneTitle(z: BeachZone): string {
  if (z === 'beachfront') return 'Первая линия (≤100 м)'
  if (z === 'walking') return 'Walking (100–500 м)'
  if (z === 'scooter') return 'Scooter (500–1500 м)'
  return 'Inland (>1500 м)'
}
