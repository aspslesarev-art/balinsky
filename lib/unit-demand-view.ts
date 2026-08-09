// Показ балла востребованности: типы, пороги, цвета.
//
// Отделено от lib/unit-demand.ts намеренно и это не косметика: тот модуль
// создаёт Supabase-клиент со СЛУЖЕБНЫМ ключом прямо на верхнем уровне, а балл
// рисуется внутри карточек юнитов — клиентских компонентов. Любой импорт
// значения из серверного модуля утащил бы ключ в браузерный бандл.

export type DemandBasis = 'zone_beds' | 'zone' | 'island'

/** Минимум, который нужен для отрисовки балла где угодно. */
export type UnitDemandView = {
  score: number
  basis: DemandBasis
  zone: string
  compsN: number
  why: string | null
}

// Границы взяты по смыслу перцентиля, а не по красоте: 50 — ровно медиана
// предложения района, поэтому «сильный» начинается заметно выше неё, а
// «слабый» — заметно ниже.
export const DEMAND_STRONG = 70
export const DEMAND_WEAK = 45

/** Подложка и полоса балла. Красный не используется: балл говорит о месте
 *  среди соседей, а не о браке. */
export function demandTone(score: number) {
  if (score >= DEMAND_STRONG) return { fg: '#15803D', bg: '#DCFCE7', bar: '#16A34A' }
  if (score >= DEMAND_WEAK) return { fg: '#A16207', bg: '#FEF9C3', bar: '#CA8A04' }
  return { fg: '#525252', bg: '#F5F5F5', bar: '#A3A3A3' }
}
