// Объекты с подтверждённой доходностью: у комплекса есть реальные брони от
// управляющей (complex_rental_actuals). Список строит
// scripts/build-verified-yield.mjs (перезапускать после правки этой таблицы).
//
// Рабочий список — в базе: site_content, раздел 'verified-yield', элементы
// 'complexes:<id>' / 'villas:<id>' / 'apartments:<id>' (скрипт пишет туда сам).
// Правка строки перестраивает страницу объекта и сбрасывает каталог — без
// выкладки. verified-yield.json — запасной список на случай пустой базы.
import data from './verified-yield.json'
import { loadSiteSection } from './site-content'

type Kind = 'complex' | 'villa' | 'apartment'
const PLURAL: Record<Kind, string> = { complex: 'complexes', villa: 'villas', apartment: 'apartments' }

function fallbackRows(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const id of data.complexes) out[`complexes:${id}`] = {}
  for (const id of data.villas) out[`villas:${id}`] = {}
  for (const id of data.apartments) out[`apartments:${id}`] = {}
  return out
}

let keys: Set<string> = new Set(Object.keys(fallbackRows()))

/**
 * Подтянуть список из базы. Зовут сборщики каталогов перед сборкой — они и
 * так пересобираются по content_version, поэтому читаем без кэша (одна
 * маленькая выборка на сборку).
 */
export async function primeVerifiedYield(): Promise<void> {
  const rows = await loadSiteSection('verified-yield', fallbackRows(), { fresh: true })
  keys = new Set(Object.keys(rows))
}

export function hasVerifiedYield(kind: Kind, id: string | null | undefined): boolean {
  return !!id && keys.has(`${PLURAL[kind]}:${id}`)
}
