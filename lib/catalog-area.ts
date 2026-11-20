// Область на карте каталога (?area=w,s,e,n): нажали на «67 объектов» на
// карте — список слева оставляет только объекты внутри (владелец 20.11.2026).
export type CatalogArea = [number, number, number, number]

export function parseArea(v: string | undefined): CatalogArea | null {
  if (typeof v !== 'string') return null
  const n = v.split(',').map(Number)
  if (n.length !== 4 || n.some(x => !Number.isFinite(x))) return null
  const [w, s, e, nn] = n
  if (w >= e || s >= nn) return null
  return [w, s, e, nn]
}

export function inArea(lat: number | null | undefined, lng: number | null | undefined, a: CatalogArea | null | undefined): boolean {
  if (!a) return true
  if (lat == null || lng == null) return false
  return lng >= a[0] && lng <= a[2] && lat >= a[1] && lat <= a[3]
}

export const areaParam = (a: CatalogArea | null | undefined) => (a ? a.map(x => x.toFixed(5)).join(',') : null)
