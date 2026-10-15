// Объекты с подтверждённой доходностью: у комплекса есть реальные брони от
// управляющей (complex_rental_actuals). Список строит
// scripts/build-verified-yield.mjs (перезапускать после правки этой таблицы).
import data from './verified-yield.json'

const SETS = {
  complex: new Set<string>(data.complexes),
  villa: new Set<string>(data.villas),
  apartment: new Set<string>(data.apartments),
}

export function hasVerifiedYield(kind: 'complex' | 'villa' | 'apartment', id: string | null | undefined): boolean {
  return !!id && SETS[kind].has(id)
}
