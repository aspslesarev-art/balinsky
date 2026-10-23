// Цвета и точки для карт «Как добраться» и «Главное рядом» (components/ListingMap.tsx).
// Без 'use client': страница считает точки на сервере и передаёт в карту только их.
import type { NearbyPlace } from './nearby-places'

// Пять цветов, которые не путаются друг с другом и с красной точкой объекта:
// синий, оранжевый, зелёный, фиолетовый, малиновый (владелец 23.10.2026).
export const ROUTE_COLOR: Record<'airport' | 'canggu' | 'ubud' | 'uluwatu' | 'sanur', string> = {
  airport: '#1F6FD1',
  canggu: '#F28E2B',
  ubud: '#2E9E44',
  uluwatu: '#8E44AD',
  sanur: '#E0398A',
}

export type RouteLines = Partial<Record<keyof typeof ROUTE_COLOR, number[][]>>

/** Группы точек на карте «Главное рядом» — категории из _nearby_places. */
export const NEAR_GROUPS = [
  { key: 'school', cats: ['school', 'international_school', 'preschool'], color: '#1F6FD1', ru: 'Школы', en: 'Schools' },
  { key: 'health', cats: ['hospital', 'pharmacy'], color: '#E0398A', ru: 'Клиники и аптеки', en: 'Clinics and pharmacies' },
  { key: 'shop', cats: ['supermarket'], color: '#8E44AD', ru: 'Магазины', en: 'Shops' },
  { key: 'food', cats: ['cafe', 'restaurant'], color: '#F28E2B', ru: 'Кафе и рестораны', en: 'Cafés and restaurants' },
  { key: 'beach', cats: ['beach', 'beachclub'], color: '#2E9E44', ru: 'Пляж', en: 'Beach' },
] as const

/** Точки в радиусе maxKm, по одной на место; и группы, которые реально есть. */
export function nearPoints(byCategory: Record<string, NearbyPlace[]>, maxKm = 1.2) {
  const seen = new Set<string>()
  const points: { lng: number; lat: number; color: string }[] = []
  const groups = new Set<string>()
  for (const g of NEAR_GROUPS) {
    for (const cat of g.cats) {
      for (const p of byCategory[cat] ?? []) {
        if (seen.has(p.id) || !(p.distanceKm <= maxKm) || p.lat == null || p.lng == null) continue
        seen.add(p.id)
        groups.add(g.key)
        points.push({ lng: p.lng, lat: p.lat, color: g.color })
      }
    }
  }
  return { points, groups: NEAR_GROUPS.filter(g => groups.has(g.key)) }
}
