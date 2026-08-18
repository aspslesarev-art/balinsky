// Нативный адаптер под прайсы LB Group.
//
// У LB Group прайс — не таблица, а генплан: юниты («№34, 1br») разбросаны
// по сетке в форме посёлка, статус закодирован заливкой по легенде
// Free/Booked/Sold/Resale/Block, цена лежит отдельным блоком по типу
// юнита. Универсальный табличный layout такую геометрию не берёт, зато в
// проекте уже есть разобранный под неё extractLbUnits — переиспользуем
// его, приведя результат к общему виду трекера.

import { extractLbUnits, LB_SPREADSHEET_ID } from '@/lib/parsers/lb-group'
import { fetchXlsxFromGoogleSheet } from '@/lib/parsers/_xlsx'
import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'

// Block — юнит снят с продажи застройщиком, Resale — перепродажа от
// собственника. Для учёта объёма и то и другое отличается от «свободен».
const STATUS: Record<string, UnitStatus> = {
  Free: 'available',
  Resale: 'available',
  Booked: 'reserved',
  Block: 'reserved',
  Sold: 'sold',
}

export function isLbGroupSource(spreadsheetId: string | null): boolean {
  return spreadsheetId === LB_SPREADSHEET_ID
}

export async function scrapeLbGroup(sourceUrl: string): Promise<ExtractResult> {
  const cells = await fetchXlsxFromGoogleSheet(sourceUrl)
  const { units, layout, legend, warnings } = extractLbUnits(cells)

  const scraped: ScrapedUnit[] = units.map(u => ({
    unitKey: u.number,
    unitType: u.bedrooms !== null ? `${u.bedrooms}br` : null,
    bedrooms: u.bedrooms,
    areaM2: u.areaM2,
    landM2: null,
    floor: null,
    status: u.status ? STATUS[u.status] ?? 'unknown' : 'unknown',
    priceUsd: u.price && u.price > 0 ? u.price : null,
    pricePerM2: u.price && u.areaM2 ? Math.round(u.price / u.areaM2) : null,
    raw: {
      number: u.number,
      legendStatus: u.status ?? '',
      lbLayout: layout,
    },
  }))

  const legendMisses = Object.keys(legend).length
  const allWarnings = [...warnings]
  if (!scraped.length) allWarnings.push('генплан LB Group разобран, но юнитов не найдено')
  else if (!legendMisses) allWarnings.push('легенда статусов не распозналась — статусы могут быть неверны')

  return { units: scraped, warnings: allWarnings }
}
