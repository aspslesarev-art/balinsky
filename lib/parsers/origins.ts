// BALI BAZA Origins — прайс-лист в Google Sheets.
// Owner: BALI BAZA, источник: https://docs.google.com/spreadsheets/d/1TWbIAH.../edit?gid=1080415579
//
// Структура листа жёстко задана колоночными индексами (12 колонок).
// Если BALI BAZA когда-то изменит этот лист — здесь упадёт явно, а не
// тихо подтянет не то.

import {
  fetchGoogleSheetCsv, fetchExistingUnits, pushUnits, autoLinkUnits,
  num, BALI_BAZA_STATUS,
  type ParserResult, type UnitInput, type UnitMatchKey,
} from './_shared'

// Точные колонки актуального прайса Origins. Заголовки многострочные
// в Google Sheets, поэтому не сверяемся со строкой — только с порядком.
const COL = {
  SECTION: 0,
  TYPE: 1,
  BEDROOM: 2,
  VILLA_SIZE: 3,
  ROOFTOP: 4,
  STAFF: 5,
  TOTAL: 6,
  PRICE: 7,
  // 8: $/m2 (computed)
  LAND: 9,
  // 10: $/m2 land (computed)
  STATUS: 11,
} as const

export async function runOriginsParser(opts: {
  complexId: string
  sourceUrl: string
  airtableToken: string
}): Promise<ParserResult> {
  const rows = await fetchGoogleSheetCsv(opts.sourceUrl)
  const hdr = rows.findIndex(r => (r[0] || '').trim() === 'Section')
  if (hdr < 0) throw new Error('Origins: не нашёл строку заголовка «Section» в прайсе')
  // Юниты — это строки с числом в колонке Section (1, 2, 3, ...). Всё
  // остальное (заголовки секций, пустые строки, подписи) отсеивается.
  const data = rows.slice(hdr + 1).filter(r => /^\d+$/.test((r[COL.SECTION] || '').trim()))

  const warnings: string[] = []
  const units: UnitInput[] = []
  const matchKeys = new Map<string, UnitMatchKey>()
  for (const r of data) {
    const sec = (r[COL.SECTION] || '').trim()
    const price = num(r[COL.PRICE])
    if (!sec || price == null || price <= 0) {
      warnings.push(`Origins #${sec || '?'}: пропущен (нет цены)`)
      continue
    }
    const bd = parseInt(r[COL.BEDROOM] || '0', 10)
    const villaSize = num(r[COL.VILLA_SIZE])
    const totalSize = num(r[COL.TOTAL])
    const status = (r[COL.STATUS] || '').trim()

    const fields: Record<string, unknown> = {
      Name: sec,
      Цена: price,
      Тип: ['Вилла'],
    }
    if (Number.isFinite(bd)) fields['Спальни'] = bd
    if (villaSize != null) fields['Жилая площадь'] = villaSize
    if (totalSize != null) fields['Общая площадь'] = totalSize
    else if (villaSize != null) fields['Общая площадь'] = villaSize
    const rooftop = num(r[COL.ROOFTOP]); if (rooftop != null) fields['Площадь руфтопа'] = rooftop
    const staff = num(r[COL.STAFF]); if (staff != null) fields['Staff building'] = staff
    const land = num(r[COL.LAND]); if (land != null) fields['Площадь земли'] = land
    if (BALI_BAZA_STATUS[status]) fields['Статус'] = BALI_BAZA_STATUS[status]

    units.push({ section: sec, fields })
    matchKeys.set(sec, {
      villaSize: villaSize,
      bedrooms: Number.isFinite(bd) ? bd : null,
    })
  }

  const existing = await fetchExistingUnits(opts.airtableToken)
  const unitsCount = await pushUnits(units, existing, 'origins', opts.airtableToken)
  const linked = await autoLinkUnits({
    complexId: opts.complexId,
    parserKey: 'origins',
    airtableToken: opts.airtableToken,
    units: matchKeys,
    warnings,
  })
  return { unitsCount, warnings, linked }
}
