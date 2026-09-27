// Закреплённый разбор: прайсы, которые проверены глазами и читаются
// без модели. Для них OpenAI не зовётся никогда — ни при первом обходе,
// ни когда застройщик поменял лист.
//
// Два вида:
//  - 'layout' — обычная таблица. Конфиг колонок написан руками и сверен
//    с листом; опорные подписи шапки (anchors) проверяются на каждом
//    обходе. Добавил застройщик строки над таблицей — шапка находится
//    ниже, и разбор сдвигается сам. Переставил колонки — разбор падает с
//    понятной ошибкой вместо того, чтобы молча читать не ту колонку.
//  - 'native' — шахматка в ячейках, свой разборщик (adapters/grid-natives).
//
// Инструкция по каждому прайсу — в документе «Прайсы застройщиков — как
// читать каждый прайс» (claude.ai artifact b70e40fd-…). Добавлять сюда
// источник можно только после такой же сверки.

import { extractUnits } from './extract'
import { textAt, type Grid } from './grid'
import { parseDune, parsePredmet, parseSectionTable, parseSwoiFloors } from './adapters/grid-natives'
import type { ExtractResult, MarketLayout, UnitStatus } from './types'

type Anchor = { col: number; re: RegExp }

export type PinnedParser =
  | { kind: 'layout'; layout: MarketLayout; anchors: Anchor[] }
  | { kind: 'native'; parse: (grid: Grid) => ExtractResult }

const T = {
  sold: 'sold', reserved: 'reserved', available: 'available',
} as const satisfies Record<string, UnitStatus>

// Статусы, общие почти для всех таблиц. Пишем явно, чтобы не зависеть
// от запасного словаря в extract.ts.
const COMMON: Record<string, UnitStatus> = {
  sold: T.sold, reserved: T.reserved, booked: T.reserved, deposit: T.reserved, reservation: T.reserved,
  available: T.available, free: T.available, 'for sale': T.available, 'on sale': T.available,
  resale: T.available, 're-sale': T.available, 'special price': T.available,
}

const a = (col: number, re: RegExp): Anchor => ({ col, re })

// Bali Baza (Kedungu, Gate 11): Section / Type / m2 / Bedroom / Price / Price m2 / Status.
const baliBazaSmall = (headerRow: number, skip: string): PinnedParser => ({
  kind: 'layout',
  anchors: [a(1, /^section$/i), a(5, /^price$/i), a(7, /^status$/i)],
  layout: {
    headerRow, firstDataRow: headerRow + 2,
    cols: { unitKey: 1, unitType: 2, area: 3, bedrooms: 4, price: 5, pricePerM2: 6, status: 7 },
    statusText: COMMON, defaultStatus: 'available', skipRowIf: skip,
  },
})

// ADVA: № / Type / USD/m2 / Sq m / Lot price (USD) / Status — у Serenity
// между Type и USD/m2 вставлен «№ of contract».
const adva = (shift: 0 | 1, firstDataRow: number, skip?: string): PinnedParser => ({
  kind: 'layout',
  anchors: [a(1, /^№$/), a(5 + shift, /lot price/i), a(6 + shift, /^status$/i)],
  layout: {
    headerRow: 1, firstDataRow,
    cols: { unitKey: 1, unitType: 2, pricePerM2: 3 + shift, area: 4 + shift, price: 5 + shift, status: 6 + shift },
    statusText: COMMON, defaultStatus: 'available', skipRowIf: skip,
  },
})

// Lyvin: шапка на EN в строке 2 и на RU в строке 3, данные с 5-й.
// У Gardens Villas подписи EN сдвинуты на колонку — верна русская шапка
// (площадь в 9-й, спальни в 10-й), поэтому якоря по ней.
const lyvin = (o: { price: number; status: number; area: number; bedrooms: number; perM2: number; ruHeader?: boolean }): PinnedParser => ({
  kind: 'layout',
  anchors: o.ruHeader
    ? [a(6, /номер юнита/i), a(o.area, /площадь/i), a(o.price, /цена за юнит c ндс/i), a(o.status, /доступность/i)]
    : [a(6, /unit number/i), a(o.price, /including vat/i), a(o.status, /availability/i)],
  layout: {
    headerRow: o.ruHeader ? 3 : 2, firstDataRow: 5,
    cols: { unitKey: 6, floor: 7, area: o.area, bedrooms: o.bedrooms, pricePerM2: o.perM2, price: o.price, status: o.status },
    statusText: COMMON, defaultStatus: 'available',
  },
})

// MAISON VERDE (все три листа): Unit / … / Price / Price Full Cash / 1st payment / Status.
// Колонка цены у листов разная и так было с первого дня — менять нельзя,
// иначе история цен и синхронизация с сайтом получат ложный скачок.
// Под таблицей идёт рекламный блок («WHY BASE ULUWATU», «Uluwatu location»)
// с тем же расположением колонок — отсекаем всё, что не похоже на номер юнита.
const maisonVerde = (headerRow: number, cols: MarketLayout['cols'], anchors: Anchor[], unitKey: string): PinnedParser => ({
  kind: 'layout',
  anchors: [a(1, /^unit$/i), a(8, /^status$/i), ...anchors],
  layout: { headerRow, firstDataRow: headerRow + 2, cols, statusText: COMMON, defaultStatus: 'available', skipRowIf: `^(?!${unitKey})` },
})

export const PINNED: Record<string, PinnedParser> = {
  // 1. Bali Baza — Baza Kedungu
  'gs:1TWbIAHCWka3ChmSxnl_n1brWpvHWygSgQygDn7SoKMI:849122232': baliBazaSmall(6, 'floor'),
  // 2. Bali Baza — Origins
  'gs:1TWbIAHCWka3ChmSxnl_n1brWpvHWygSgQygDn7SoKMI:1080415579': {
    kind: 'layout',
    anchors: [a(1, /^section$/i), a(8, /total building size/i), a(9, /off-plan\s*price$/i), a(13, /^status$/i)],
    layout: {
      headerRow: 6, firstDataRow: 8,
      cols: { unitKey: 1, unitType: 2, bedrooms: 3, area: 8, price: 9, pricePerM2: 10, landArea: 11, status: 13 },
      statusText: COMMON, defaultStatus: 'available', skipRowIf: '^(?!\\d+$)',
    },
  },
  // 3. Bali Baza — Gate 11
  'gs:1TWbIAHCWka3ChmSxnl_n1brWpvHWygSgQygDn7SoKMI:623975832': baliBazaSmall(7, 'floor'),
  // 26. Teus group — Amani Melasti
  'gs:1iPSHwF3-98F_SNnZlZb46FpXvmDOgU60QEMtE8SxSPM:0': {
    kind: 'layout',
    anchors: [a(2, /unit #/i), a(5, /^status$/i), a(6, /full price/i)],
    layout: {
      headerRow: 3, firstDataRow: 4,
      cols: { floor: 1, unitKey: 2, area: 3, unitType: 4, status: 5, price: 6 },
      statusText: COMMON, defaultStatus: 'available',
    },
  },
  // 27. Teus group — Ramada Nusa Dua
  'gs:1rWSTrsncngp3E7HbZC2c_grGI7CnYmT4OE_QSPElxuE:23516717': {
    kind: 'layout',
    anchors: [a(1, /unit number/i), a(4, /unit price/i), a(5, /^status$/i)],
    layout: {
      headerRow: 4, firstDataRow: 5,
      cols: { unitKey: 1, unitType: 2, area: 3, price: 4, status: 5 },
      statusText: COMMON, defaultStatus: 'available', skipRowIf: '^(villas|rooms|unit number)$',
    },
  },
  // 33. Urban Escape — PRIVÉ Pererenan
  'gs:1rlG6QyDCOdC2J-StGrE7KzkGEVSx_z2cfjudFNUyxcI:0': {
    kind: 'layout',
    anchors: [a(1, /unit number/i), a(7, /unit price/i), a(8, /^status$/i)],
    layout: {
      headerRow: 14, firstDataRow: 15,
      cols: { unitKey: 1, unitType: 2, area: 3, landArea: 4, price: 7, status: 8 },
      statusText: COMMON, defaultStatus: 'available', skipRowIf: '^(townhouses|riverfront villas|unit number)$',
    },
  },
  // 34–37. ADVA
  'gs:1PdxdukH8gMvP5zQo8RE4RrjkcSXAKA6rPEevHfRdlfs:0': adva(0, 2, '^(apartment|townhouse|villa|\\d+ floor|ground floor)$'),
  'gs:1PdxdukH8gMvP5zQo8RE4RrjkcSXAKA6rPEevHfRdlfs:900617115': adva(0, 2),
  'gs:1PdxdukH8gMvP5zQo8RE4RrjkcSXAKA6rPEevHfRdlfs:1726966801': adva(0, 2),
  'gs:1PdxdukH8gMvP5zQo8RE4RrjkcSXAKA6rPEevHfRdlfs:665506095': adva(1, 2),
  // 38–41. Lyvin
  'gs:1ZBD4yL8S741GNqSUYoxufG4GT3Zvexd2lZd1kTxczXE:248470669': lyvin({ area: 8, bedrooms: 9, perM2: 12, price: 15, status: 16 }),
  'gs:1ZBD4yL8S741GNqSUYoxufG4GT3Zvexd2lZd1kTxczXE:138104469': lyvin({ area: 9, bedrooms: 10, perM2: 12, price: 15, status: 16, ruHeader: true }),
  'gs:1ZBD4yL8S741GNqSUYoxufG4GT3Zvexd2lZd1kTxczXE:0': lyvin({ area: 8, bedrooms: 9, perM2: 12, price: 15, status: 16 }),
  'gs:1ZBD4yL8S741GNqSUYoxufG4GT3Zvexd2lZd1kTxczXE:1971755056': lyvin({ area: 8, bedrooms: 9, perM2: 11, price: 14, status: 15 }),
  // 42. Eco Invest Group — Minori: цена при полной оплате (колонка L),
  // рядом цена в рассрочку — её не брать.
  'gs:1rGycAflMHRvlB6EewJ2Oc1pNXUh3SlrtzmxZWWWuOT4:0': {
    kind: 'layout',
    anchors: [a(1, /^unit$/i), a(2, /^status$/i), a(12, /price full payment/i)],
    layout: {
      headerRow: 1, firstDataRow: 2,
      cols: { unitKey: 1, status: 2, bedrooms: 3, floor: 5, area: 7, pricePerM2: 9, price: 12, landArea: 15 },
      statusText: COMMON, defaultStatus: 'available', skipRowIf: '^spa|^villa\\s*$',
    },
  },
  // 72. Bali Investments — Dune
  'gs:1vox8qYmzSFukGhqwIiiE0CWFgo2Q7FNQWYQnOOjbA_w:0': { kind: 'native', parse: parseDune },
  // 92, 95. Predmet.construction — CASCADE, BABAKAN
  'gs:1yy98fYnKi4-xGFGIPSVkJw3dAEZlbJjw:996033092': { kind: 'native', parse: parsePredmet },
  'gs:1ogkQ2zJJbiBEl8WyRVOmWGU-4oT1XMwv:1314932336': { kind: 'native', parse: parsePredmet },
  // 116. Anta group — NOAH x SUMBA: SOLD вместо цены, жёлтая цена = бронь.
  'gs:1jAX0ZZpYZqUHOSjs5P2OiqZO3NWCv7di:1810121757': {
    kind: 'layout',
    anchors: [a(3, /^type$/i), a(10, /№ build/i), a(11, /^price/i)],
    layout: {
      headerRow: 3, firstDataRow: 4,
      cols: { unitType: 3, bedrooms: 5, area: 6, landArea: 9, unitKey: 10, price: 11 },
      statusText: COMMON, statusInPriceCell: true,
      statusColors: [{ hex: 'FFFFFF00', status: 'reserved' }, { hex: 'FFFF0000', status: 'sold' }],
      statusColorCol: 11, defaultStatus: 'available',
    },
  },
  // 117. Anta group — MediSpa (апартаменты + виллы)
  'gs:1DGa-aToFKOGNDWaX8mlU7oXcDxISkpl-:1810121757': { kind: 'native', parse: parseSectionTable },
  // 122. High Quality Construction — Bloom: колонка H — цена за м², I — за юнит.
  'gs:1jTkuDTSCgKdU-wSVwI68SVMA514hNWFgVJWHhd2l1rA:0': {
    kind: 'layout',
    anchors: [a(1, /^number$/i), a(9, /price now/i), a(10, /^status$/i)],
    layout: {
      headerRow: 2, firstDataRow: 4,
      cols: { unitKey: 1, unitType: 3, area: 6, pricePerM2: 8, price: 9, status: 10 },
      statusText: COMMON, defaultStatus: 'available', skipRowIf: '\\d+\\s*floor',
    },
  },
  // 123. High Quality Construction — Ardhana: цена «Price now» (F), не «после
  // стройки» (G). Участок в арах — в land_m2 не пишем.
  'gs:1Dub6fRbuB9B2YhUKgpdo-76DJAUypBGUUhAzrmLO4gA:0': {
    kind: 'layout',
    anchors: [a(1, /^number$/i), a(8, /available/i)],
    layout: {
      headerRow: 4, firstDataRow: 6,
      cols: { unitKey: 1, unitType: 2, area: 3, price: 6, status: 8 },
      statusText: COMMON, defaultStatus: 'available', skipRowIf: '^(feng shui villas|luxury villas|hotel)$',
    },
  },
  // 143. SWOI Development — SWOI BERAWA
  'gs:1uukTUQjm6k1ds17F-5fdWJEp6YSdkvRz-ZV_dV-E9cM:2096436159': { kind: 'native', parse: parseSwoiFloors },
  // 170–172. MAISON VERDE
  'gs:1ekW3nqn0DT4KPlDU49xMuHUlThBfhncDsfxnRcEKeq0:0': maisonVerde(
    11,
    { unitKey: 1, bedrooms: 2, landArea: 3, area: 4, price: 6, status: 8 },
    [a(6, /price full cash/i)],
    'villa',
  ),
  'gs:1gc3_QpupXqvoJMYeRKAZo9QMyN2pN7rz4ywhxlMwLYs:0': maisonVerde(
    11,
    { unitKey: 1, landArea: 2, area: 3, bedrooms: 4, price: 5, status: 8 },
    [a(5, /^price$/i)],
    'villa',
  ),
  'gs:1w9MeDw7IivSOtIR5myk58sk6I6evEsZ6pKdIDxOKjk4:0': maisonVerde(
    11,
    { unitKey: 1, landArea: 2, area: 3, bedrooms: 4, price: 6, status: 8 },
    [a(6, /price full cash/i)],
    '\\d+$',
  ),
}

export function pinnedFor(sourceKey: string): PinnedParser | null {
  return PINNED[sourceKey] ?? null
}

// Сколько строк вокруг ожидаемой шапки просматриваем, если застройщик
// вставил или удалил строки сверху.
const HEADER_SEARCH = 40

export function runPinned(grid: Grid, pinned: PinnedParser): ExtractResult {
  if (pinned.kind === 'native') return pinned.parse(grid)

  const { layout, anchors } = pinned
  const matches = (r: number) => anchors.every(x => x.re.test(textAt(grid, r, x.col).replace(/\s+/g, ' ').trim()))
  let headerRow = -1
  for (let d = 0; d <= HEADER_SEARCH && headerRow < 0; d++) {
    for (const r of d ? [layout.headerRow + d, layout.headerRow - d] : [layout.headerRow]) {
      if (r >= 1 && r <= grid.rowCount && matches(r)) { headerRow = r; break }
    }
  }
  if (headerRow < 0) {
    throw new Error('структура листа изменилась: шапка таблицы не нашлась на своих колонках — нужен пересмотр разбора (модель не вызывалась)')
  }
  const shift = headerRow - layout.headerRow
  const result = extractUnits(grid, { ...layout, headerRow, firstDataRow: layout.firstDataRow + shift })
  if (shift) result.warnings.push(`шапка сдвинулась на ${shift} строк — разбор подстроился`)
  return result
}
