// Типы трекера рынка: конфиг разбора листа прайса и результат разбора.
//
// Прайсы застройщиков оформлены каждый по-своему: шапка то на 4-й, то на
// 6-й строке; статус то отдельной колонкой, то словом «SOLD» прямо в
// колонке цены, то вообще только заливкой ячейки. Поэтому разбор идёт в
// два шага: один раз строим MarketLayout под конкретный лист (см.
// layout-llm.ts), дальше применяем его детерминированно (extract.ts).

export type UnitStatus = 'available' | 'reserved' | 'sold' | 'unknown'

export const UNIT_STATUSES: readonly UnitStatus[] = ['available', 'reserved', 'sold', 'unknown']

// Номера строк и колонок — одно-индексные, как в самой таблице (A=1).
export type MarketLayout = {
  // Строка с заголовками колонок. 0 — заголовка нет.
  headerRow: number
  // Первая строка с данными.
  firstDataRow: number
  cols: {
    unitKey: number
    unitType?: number
    area?: number
    landArea?: number
    bedrooms?: number
    floor?: number
    price?: number
    pricePerM2?: number
    status?: number
  }
  // Тот же набор колонок, повторённый правее: генпланы часто рисуют
  // несколько блоков юнитов бок о бок (корпус слева, корпус справа), и
  // тогда одной строке листа соответствует несколько юнитов.
  extraCols?: Array<MarketLayout['cols']>
  // Текст ячейки (lowercase, trim) → канонический статус.
  statusText?: Record<string, UnitStatus>
  // Прайс пишет «SOLD» в колонку цены вместо суммы (так делает Anta group).
  statusInPriceCell?: boolean
  // Заливка ячейки как статус. Читается из колонки statusColorCol,
  // а если она не задана — из колонки unitKey.
  statusColors?: Array<{ hex: string; status: UnitStatus }>
  statusColorCol?: number
  // Чем считать юнит, когда статус ниоткуда не вывелся. Для прайсов, где
  // проданное просто вычёркивают, разумно 'available'; где непонятно —
  // 'unknown', чтобы не считать несуществующий объём продаж.
  defaultStatus?: UnitStatus
  // Строку пропускаем, если ячейка unitKey матчится этим regex
  // (подзаголовки секций вроде «1 FLOOR», «Villas», «ИТОГО»).
  skipRowIf?: string
  // Лист повёрнут: юниты идут по колонкам, а характеристики по строкам.
  // Тогда перед разбором строки и колонки меняются местами, и все номера
  // в cols/headerRow относятся уже к повёрнутому листу.
  transposed?: boolean
  // Свободная заметка от модели — что за лист и как он устроен. Только
  // для человека в админке, кодом не используется.
  notes?: string
  // Лист вообще не шахматка: сводка проектов, генплан картинкой, список
  // документов. Причина текстом — она попадёт в карточку источника, и
  // такой лист не пойдёт в историю, чтобы не портить статистику.
  unsupported?: string
}

// Юнит, вынутый из листа. Ещё не сопоставлен с базой.
export type ScrapedUnit = {
  unitKey: string
  unitType: string | null
  bedrooms: number | null
  areaM2: number | null
  landM2: number | null
  floor: string | null
  status: UnitStatus
  priceUsd: number | null
  pricePerM2: number | null
  // Вся строка прайса как есть — на случай если понадобится поле,
  // которого нет в колонках выше.
  raw: Record<string, string>
}

export type ExtractResult = {
  units: ScrapedUnit[]
  warnings: string[]
}

// У страницы Notion и у обычного лендинга нет колонок, поэтому вместо
// конфига разбора храним сам результат и хеш текста: страница не
// изменилась — модель не нужна, и номера юнитов не уплывают.
export type TextCache = {
  // 'notion' — как писали раньше, оставлено ради уже сохранённых строк.
  kind: 'text' | 'notion'
  textHash: string
  units: ScrapedUnit[]
}

// Что лежит в market_sources.layout: конфиг таблицы или кеш текста.
export type SourceLayout = MarketLayout | TextCache

export function isTextCache(v: SourceLayout | null | undefined): v is TextCache {
  const kind = (v as TextCache | null)?.kind
  return kind === 'text' || kind === 'notion'
}

// Строка реестра источников (public.market_sources).
export type MarketSource = {
  id: number
  source_key: string
  source_kind: 'google' | 'unitbox' | 'notion' | 'site' | 'pdf'
  source_url: string
  spreadsheet_id: string | null
  gid: string | null
  row_no: number | null
  developer: string
  complex: string
  unit_types: string | null
  active: boolean
  layout: SourceLayout | null
  layout_fingerprint: string | null
}
