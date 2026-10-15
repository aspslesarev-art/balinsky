// Объекты с подтверждённой доходностью: комплекс сам сдаётся на Booking,
// и калькулятор считает по его реальной загрузке и цене. Список строит
// scripts/build-verified-yield.mjs (перезапускать после правки
// complex_booking_match).
import data from './verified-yield.json'

const SETS = {
  complex: new Set<string>(data.complexes),
  villa: new Set<string>(data.villas),
  apartment: new Set<string>(data.apartments),
}

export function hasVerifiedYield(kind: 'complex' | 'villa' | 'apartment', id: string | null | undefined): boolean {
  return !!id && SETS[kind].has(id)
}
