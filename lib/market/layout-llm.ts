
import { chatJson } from './llm'
import { colorSummary, previewForPrompt, type Grid } from './grid'
import { UNIT_STATUSES, type MarketLayout, type UnitStatus } from './types'

// Разовое построение маппинга колонок под конкретный лист прайса.
//
// Писать по парсеру на каждого из ~20 застройщиков и потом чинить их
// после каждой правки в чужой таблице — неподъёмно. Поэтому модель
// вызывается один раз на структуру листа, отдаёт конфиг, конфиг
// сохраняется и дальше применяется обычным кодом бесплатно. Заново
// модель зовём, только когда изменился отпечаток структуры.

const SYSTEM = `Ты разбираешь прайс-листы застройщиков недвижимости на Бали (шахматки юнитов).
Тебе дают текстовый дамп листа таблицы: номера строк (R1, R2, ...), номера колонок и содержимое ячеек.
{fill:XXXXXXXX} после значения означает цвет заливки ячейки.

Твоя задача — вернуть JSON-конфиг, по которому программа сама вынет из листа список юнитов.

Верни ТОЛЬКО JSON такого вида:
{
  "headerRow": <номер строки с названиями колонок, 0 если её нет>,
  "firstDataRow": <номер первой строки с юнитом>,
  "cols": {
    "unitKey": <номер колонки с номером/кодом юнита — ОБЯЗАТЕЛЬНО>,
    "unitType": <номер колонки с типом юнита или null>,
    "area": <площадь юнита в м2 или null>,
    "landArea": <площадь участка или null>,
    "bedrooms": <число спален или null>,
    "floor": <этаж или null>,
    "price": <итоговая цена юнита или null>,
    "pricePerM2": <цена за м2 или null>,
    "status": <колонка со статусом продажи или null>
  },
  "extraCols": [ { "unitKey": ..., "unitType": ..., "area": ..., "price": ..., "status": ... } ],
  "statusText": { "<текст ячейки в нижнем регистре>": "available|reserved|sold" },
  "statusInPriceCell": <true, если вместо суммы в колонке цены пишут слово вроде SOLD>,
  "statusColors": [ { "hex": "FFRRGGBB", "status": "available|reserved|sold" } ],
  "statusColorCol": <номер колонки, чью заливку читать как статус, или null>,
  "defaultStatus": "available" | "unknown",
  "skipRowIf": "<regex по ячейке unitKey для строк-подзаголовков, или null>",
  "notes": "<одна фраза: что за лист и как в нём закодирован статус>",
  "unsupported": "<заполняй ТОЛЬКО если лист не является шахматкой юнитов: одна фраза почему. Иначе null>"
}

Правила:
- Номера строк и колонок бери РОВНО те, что в дампе (колонки одно-индексные, как число в скобках).
- unitKey — колонка, где у каждого юнита свой номер или код (AL101, D2-1-1, 12). Если номеров два (сквозной счётчик и код юнита) — бери код юнита, он стабильнее.
- price — цена, по которой юнит продаётся сейчас. Если колонок с ценой несколько (со скидкой, в рассрочку, за м2), выбери цену за юнит целиком при полной оплате.
- statusText заполняй всеми написаниями, которые реально встретил в листе, в нижнем регистре.
- statusColors заполняй, ТОЛЬКО если статус действительно кодируется заливкой и её значение понятно из легенды или из подписей. Если цвет — просто оформление (шапка, чередование строк), оставь пустой массив.
- defaultStatus: "available", если в листе проданные юниты явно помечены, а значит непомеченное свободно. "unknown", если понять статус нельзя.
- skipRowIf нужен для строк вроде "1 FLOOR", "Villas", "ИТОГО", которые стоят в колонке unitKey, но юнитами не являются.
- defaultStatus ставь "available", если лист по смыслу перечисляет то, что продаётся (заголовок вроде "available units", "availability", "units", "resale"), и проданное в нём либо помечено, либо просто не перечислено.
- extraCols нужен, когда одна строка описывает НЕСКОЛЬКО юнитов: тот же набор колонок повторён правее (корпус слева, корпус справа). Перечисли остальные блоки в том же формате, что cols; общие правила статусов и заголовок у них те же. Если блок один — верни пустой массив.
- unsupported заполняй, если строка листа описывает не отдельный юнит, а целый проект ("4 villas 1BR"), или это сводка/список документов/генплан без данных по юнитам. В таком случае остальные поля можно оставить как получится.
- Если юниты идут по столбцам, а не по строкам, ты увидишь лист уже развёрнутым: разбирай его как есть, по строкам.
- Никакого текста вне JSON.`

export type BuildLayoutResult = { layout: MarketLayout; warnings: string[] }

export async function buildLayout(grid: Grid, meta: { developer: string; complex: string; unitTypes: string | null }): Promise<BuildLayoutResult> {
  const colors = colorSummary(grid)
  const user = [
    `Застройщик: ${meta.developer}`,
    `Комплекс: ${meta.complex}`,
    meta.unitTypes ? `Тип юнитов по нашей картотеке: ${meta.unitTypes}` : '',
    `Размер листа: ${grid.rowCount} строк, ${grid.colCount} колонок`,
    '',
    'Начало листа:',
    previewForPrompt(grid),
    '',
    colors ? `Заливки, встречающиеся в листе:\n${colors}` : 'Заливок в листе нет.',
  ].filter(Boolean).join('\n')

  const parsed = await chatJson(SYSTEM, user, {
    feature: 'market-layout',
    meta: { developer: meta.developer, complex: meta.complex },
    // Эти ошибки — про сам лист, а не про доступность провайдера, так что
    // повторять их на запасном бессмысленно.
    isFatal: m => m === 'layout_no_unit_key' || m === 'layout_bad_first_row' || m.startsWith('лист не разбирается'),
  })
  return normalizeLayout(parsed, grid)
}


// Модель иногда возвращает номер колонки строкой, статус в неожиданном
// регистре или колонку за границей листа. Чиним что чинится, остальное
// отбрасываем с предупреждением — лучше потерять поле, чем разобрать
// лист неправильно и записать это в историю.
export function normalizeLayout(raw: unknown, grid: Grid): BuildLayoutResult {
  const warnings: string[] = []
  const parsed = (raw ?? {}) as Record<string, unknown>

  const colIn = (v: unknown, label: string): number | undefined => {
    const n = typeof v === 'string' ? Number(v) : v
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 1) return undefined
    if (n > grid.colCount) {
      warnings.push(`колонка ${label}=${n} за пределами листа (${grid.colCount})`)
      return undefined
    }
    return Math.round(n)
  }

  const rawCols = (parsed.cols ?? {}) as Record<string, unknown>
  const unsupported = typeof parsed.unsupported === 'string' && parsed.unsupported.trim() ? parsed.unsupported.trim() : null
  const unitKey = colIn(rawCols.unitKey, 'unitKey')
  // У не-шахматки колонки юнита может не быть вовсе — это не сбой
  // разбора, а свойство листа, и сказать об этом надо человеческой
  // причиной, а не кодом ошибки.
  if (!unitKey && unsupported) throw new Error(`лист не разбирается по юнитам: ${unsupported}`)
  if (!unitKey) throw new Error('layout_no_unit_key')

  const headerRow = numOr(parsed.headerRow, 0)
  const claimedFirstRow = numOr(parsed.firstDataRow, headerRow + 1)
  const inSheet = (r: number) => r >= 1 && r <= grid.rowCount
  // Модель иногда промахивается мимо листа. Строка сразу под шапкой —
  // разумная замена: лишние строки всё равно отсеет extractUnits.
  const firstDataRow = inSheet(claimedFirstRow)
    ? claimedFirstRow
    : inSheet(headerRow + 1)
      ? headerRow + 1
      : 1
  if (firstDataRow !== claimedFirstRow) {
    warnings.push(`первая строка данных ${claimedFirstRow} вне листа (${grid.rowCount} строк) — взяли ${firstDataRow}`)
  }

  const layout: MarketLayout = {
    headerRow: headerRow >= 0 && headerRow <= grid.rowCount ? headerRow : 0,
    firstDataRow,
    cols: {
      unitKey,
      unitType: colIn(rawCols.unitType, 'unitType'),
      area: colIn(rawCols.area, 'area'),
      landArea: colIn(rawCols.landArea, 'landArea'),
      bedrooms: colIn(rawCols.bedrooms, 'bedrooms'),
      floor: colIn(rawCols.floor, 'floor'),
      price: colIn(rawCols.price, 'price'),
      pricePerM2: colIn(rawCols.pricePerM2, 'pricePerM2'),
      status: colIn(rawCols.status, 'status'),
    },
    extraCols: normalizeExtraCols(parsed.extraCols, colIn),
    statusText: normalizeStatusText(parsed.statusText, warnings),
    statusInPriceCell: parsed.statusInPriceCell === true,
    statusColors: normalizeColors(parsed.statusColors, warnings),
    statusColorCol: colIn(parsed.statusColorCol, 'statusColorCol'),
    defaultStatus: parsed.defaultStatus === 'available' ? 'available' : 'unknown',
    skipRowIf: typeof parsed.skipRowIf === 'string' && parsed.skipRowIf ? parsed.skipRowIf : undefined,
    unsupported: typeof parsed.unsupported === 'string' && parsed.unsupported.trim() ? parsed.unsupported.slice(0, 200) : undefined,
    notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 400) : undefined,
  }

  if (!layout.cols.price) warnings.push('модель не нашла колонку цены — история цен по этому листу собираться не будет')
  return { layout, warnings }
}

// Дополнительные блоки колонок. Блок без номера юнита бессмыслен —
// такой отбрасываем молча: это чаще всего пустой элемент из шаблона
// ответа, а не потерянные данные.
function normalizeExtraCols(
  v: unknown,
  colIn: (v: unknown, label: string) => number | undefined,
): Array<MarketLayout['cols']> | undefined {
  if (!Array.isArray(v)) return undefined
  const out: Array<MarketLayout['cols']> = []
  for (const entry of v) {
    const e = (entry ?? {}) as Record<string, unknown>
    const unitKey = colIn(e.unitKey, 'extraCols.unitKey')
    if (!unitKey) continue
    out.push({
      unitKey,
      unitType: colIn(e.unitType, 'extraCols.unitType'),
      area: colIn(e.area, 'extraCols.area'),
      landArea: colIn(e.landArea, 'extraCols.landArea'),
      bedrooms: colIn(e.bedrooms, 'extraCols.bedrooms'),
      floor: colIn(e.floor, 'extraCols.floor'),
      price: colIn(e.price, 'extraCols.price'),
      pricePerM2: colIn(e.pricePerM2, 'extraCols.pricePerM2'),
      status: colIn(e.status, 'extraCols.status'),
    })
  }
  return out.length ? out : undefined
}

function numOr(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback
}

function isStatus(v: unknown): v is UnitStatus {
  return typeof v === 'string' && (UNIT_STATUSES as readonly string[]).includes(v)
}

function normalizeStatusText(v: unknown, warnings: string[]): Record<string, UnitStatus> | undefined {
  if (!v || typeof v !== 'object') return undefined
  const out: Record<string, UnitStatus> = {}
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    if (isStatus(value)) out[key.trim().toLowerCase()] = value
    else warnings.push(`статус «${key}» → «${String(value)}» отброшен: неизвестное значение`)
  }
  return Object.keys(out).length ? out : undefined
}

function normalizeColors(v: unknown, warnings: string[]): Array<{ hex: string; status: UnitStatus }> | undefined {
  if (!Array.isArray(v)) return undefined
  const out: Array<{ hex: string; status: UnitStatus }> = []
  for (const entry of v) {
    const e = entry as Record<string, unknown>
    const hex = typeof e?.hex === 'string' ? e.hex.replace(/^#/, '').toUpperCase() : null
    if (!hex || !/^[0-9A-F]{6}([0-9A-F]{2})?$/.test(hex) || !isStatus(e?.status)) {
      warnings.push(`цветовое правило отброшено: ${JSON.stringify(entry).slice(0, 80)}`)
      continue
    }
    out.push({ hex: hex.length === 6 ? `FF${hex}` : hex, status: e.status })
  }
  return out.length ? out : undefined
}
