// Какие подборки-хабы отдаём Google (аудит 21.11.2026).
// Тысячи сочетаний «район × спальни × стиль × статус × цена» по 3–12
// объектов на 9 языках Google считает массово созданными страницами: 3,1 тыс.
// он обошёл и не взял в индекс, и это тянет вниз весь раздел. Оставляем в
// поиске только сильные: корень раздела, один или два фильтра (район /
// спальни / статус / тип ЖК / цена) и минимум HUB_MIN_OBJECTS объектов.
// Стили и сочетания из 3 фильтров — только для людей (noindex, follow).
export const HUB_MIN_OBJECTS = 8

type HubFilters = {
  district?: string[]
  bedrooms?: string[]
  status?: string[]
  types?: string[]
  style?: string[]
  priceMin?: number | null
  priceMax?: number | null
}

export function isStrongHub(f: HubFilters, count: number): boolean {
  if ((f.style?.length ?? 0) > 0) return false
  const hasPrice = f.priceMin != null || f.priceMax != null
  const dims = [f.district, f.bedrooms, f.status, f.types].filter(d => (d?.length ?? 0) > 0).length + (hasPrice ? 1 : 0)
  if (dims === 0) return true // корень раздела
  if (dims > 2) return false
  return count >= HUB_MIN_OBJECTS
}
