// BALI BAZA Sunset Village (resale) — прайс-лист в Google Sheets.
// Источник: https://docs.google.com/spreadsheets/d/1TWbIAH.../edit?gid=2128856546
//
// Это resale-объект: большинство юнитов уже проданы или забронированы,
// только Available по-настоящему доступны. Лист простой — 7 колонок,
// все юниты 2BR разной площади (72/75 м² → планировки V00457/V00458,
// плюс D1-D6 124/150 м² ждут отдельных планировок).

import {
  fetchGoogleSheetCsv, fetchExistingUnits, pushUnits, autoLinkUnits,
  num, BALI_BAZA_STATUS,
  type ParserResult, type UnitInput, type UnitMatchKey,
} from './_shared'

const COL = {
  SECTION: 0,
  VILLA_M2: 1,
  LAND_M2: 2,
  BEDROOM: 3,
  PRICE: 4,
  // 5: Price m2 (computed)
  STATUS: 6,
} as const

export async function runSunsetVillageParser(opts: {
  complexId: string
  sourceUrl: string
  airtableToken: string
}): Promise<ParserResult> {
  const rows = await fetchGoogleSheetCsv(opts.sourceUrl)
  const hdr = rows.findIndex(r => (r[0] || '').trim() === 'Section')
  if (hdr < 0) throw new Error('Sunset Village: не нашёл строку заголовка «Section»')
  // Юниты — это всё что ниже заголовка с непустой Section и числовой
  // ценой. Section-разделители («2 BDR VILLA» без цены) отсеиваются.
  const data = rows.slice(hdr + 1).filter(r => {
    const sec = (r[COL.SECTION] || '').trim()
    if (!sec) return false
    const p = num(r[COL.PRICE])
    return p != null && p > 0
  })

  const warnings: string[] = []
  const units: UnitInput[] = []
  const matchKeys = new Map<string, UnitMatchKey>()
  for (const r of data) {
    const sec = (r[COL.SECTION] || '').trim()
    const price = num(r[COL.PRICE])!
    const bd = parseInt(r[COL.BEDROOM] || '0', 10)
    const villaSize = num(r[COL.VILLA_M2])
    const land = num(r[COL.LAND_M2])
    const status = (r[COL.STATUS] || '').trim()

    const fields: Record<string, unknown> = {
      Name: sec,
      Цена: price,
      Тип: ['Вилла'],
    }
    if (Number.isFinite(bd)) fields['Спальни'] = bd
    if (villaSize != null) {
      fields['Жилая площадь'] = villaSize
      // У Sunset Village нет отдельного Total — это одноэтажные виллы,
      // жилая = общая площадь.
      fields['Общая площадь'] = villaSize
    }
    if (land != null) fields['Площадь земли'] = land
    if (BALI_BAZA_STATUS[status]) fields['Статус'] = BALI_BAZA_STATUS[status]

    units.push({ section: sec, fields })
    matchKeys.set(sec, {
      villaSize,
      bedrooms: Number.isFinite(bd) ? bd : null,
    })
  }

  const existing = await fetchExistingUnits(opts.airtableToken)
  const unitsCount = await pushUnits(units, existing, 'sunset_village', opts.airtableToken)
  const linked = await autoLinkUnits({
    complexId: opts.complexId,
    parserKey: 'sunset_village',
    airtableToken: opts.airtableToken,
    units: matchKeys,
    warnings,
  })
  return { unitsCount, warnings, linked }
}
