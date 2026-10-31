// Pro-карточка каталога (макет «Pro: доход от и до + вероятность»,
// 30.10.2026). Два расчёта:
//
// 1. Вероятность — шанс по соседям (решение владельца 31.10.2026, вместо
//    прежнего балла по правилам, который не отвечал на вопрос «вероятность
//    чего»): из соседей на Booking того же типа и спальности — сколько своей
//    медианной ценой ночи и загрузкой за всё собранное время дали бы объекту
//    не меньше нижней границы вилки. Рядом — 2 км (мало — 3 км), отдельно —
//    округа 10 км; сетевые отели исключены (booking_neighbour_perf, миграция 138).
// 2. Причины (что поднимает и что опускает доход) — список в «Почему?».
//    Баллы у причин остались только для порядка: плюсы, нейтральные, минусы.
//
// Вес вида — по замеру booking_occ_drivers (3 692 виллы с разобранными фото,
// 14–30.10.2026, разница загрузки в п.п. внутри района и числа спален):
// джунгли +3,9, полный вид на океан +7,4, без вида −9,4, город −3,9, рисовые
// поля −0,7 (то есть не влияют). Баллы ≈ двойные п.п.
import type { InvestmentSnapshot } from './snapshot'
import { computeEconomics } from './economics'
import { landColorBucket } from '../land-use'

export type ViewKind =
  | 'jungle' | 'ocean_full' | 'ocean_partial' | 'rice_field' | 'cliff'
  | 'mountain' | 'river_valley' | 'city' | 'garden' | 'none'

/** k — какая причина; d — в какую сторону; n/s — число или слово для текста. */
export type ChanceFactor = {
  k: 'view' | 'own' | 'land' | 'demand' | 'permit' | 'lease' | 'built' | 'place' | 'coast'
  d: 1 | 0 | -1
  n?: number
  s?: string
}

/** Pro-карточка: вилка дохода в %, середина (= цифра страницы объекта),
 *  вероятность и причины. mode monthly — жёлтая земля, сдаётся помесячно. */
export type YieldRange = {
  low: number
  high: number
  mid: number
  /** Шанс по соседям, %: chanceK из chanceN соседей в chanceRadiusM дали бы
   *  не меньше low. null — соседей с историей меньше пяти или помесячная сдача. */
  chance: number | null
  chanceK: number | null
  chanceN: number | null
  chanceRadiusM: number | null
  /** То же по округе 10 км — «как вообще сдаются такие объекты в районе». */
  areaK: number | null
  areaN: number | null
  mode: 'daily' | 'monthly'
  /** Цена входа, $: доход в деньгах = доля × она. */
  entryUsd: number | null
  factors: ChanceFactor[]
}

/** Карточка комплекса: вилка от самого низкого до самого высокого дохода
 *  его юнитов и разброс вероятности; по группам — виллы и апартаменты. */
export type ComplexYieldRange = {
  low: number
  high: number
  groups: { kind: 'villa' | 'apartment'; n: number; low: number; high: number }[]
}

const VIEW_POINTS: Record<ViewKind, number> = {
  ocean_full: 10, jungle: 8, cliff: 6, ocean_partial: 3, river_valley: 3, garden: 3,
  mountain: 2, rice_field: 0, city: -6, none: -10,
}

/** Меньше пяти соседей с историей — шанс не считаем: 2 из 3 ничего не значит. */
const MIN_NEIGHBOURS = 5
/** Потолок загрузки — как OWN_OCC_CAP в snapshot.ts: 100% — закрытый календарь. */
const OCC_CAP = 0.9

export type ChanceInput = {
  snap: InvestmentSnapshot
  /** Сырой «Разрешение» объекта (или комплекса): PBG, SLF, «Заявка PBG», «нет». */
  permit: string | null
  /** Сырой «Land color» объекта (у апартаментов — комплекса). */
  landColor: string | null
  view: ViewKind | null
  /** До береговой линии, м (listing_geo_facts). На Буките берег — это часто
   *  скалы, а не пляж, поэтому пишем «до берега», без обещаний про пляж. */
  coastM: number | null
}

/** Сосед на Booking: медианная цена ночи ($) и загрузка (%) за всё время сбора. */
export type NeighbourPerf = { price: number; occupancy: number }

/**
 * Сколько соседей своей ценой ночи и загрузкой дали бы объекту не меньше
 * lowCap. Всё остальное (площадка, управление, расходы, цена входа) — этого
 * объекта, как в средней колонке сценариев на странице объекта.
 */
export function neighbourChance(snap: InvestmentSnapshot, lowCap: number, rows: NeighbourPerf[]): { k: number; n: number } | null {
  const v = snap.villa
  const caps: number[] = []
  for (const r of rows) {
    const cap = computeEconomics({
      adr: r.price, occupancy: Math.min(OCC_CAP, r.occupancy / 100),
      adrRealization: snap.region.adrRealizationByScenario.median,
      phrOwnerShare: snap.region.phrOwnerShareByScenario.median,
      area: v.area, bedrooms: v.bedrooms, askingPrice: v.askingPrice,
      leaseholdYearsLeft: v.leaseholdYearsLeft, taxStatus: 'beforeTax', furnished: v.furnished, landRentYear: v.landRentYear, region: snap.region,
    }).capRate
    if (cap != null) caps.push(cap)
  }
  if (caps.length < MIN_NEIGHBOURS) return null
  // Сравниваем с округлённой границей — той, что видит человек на карточке.
  const edge = Math.round(lowCap * 1000) / 1000
  return { k: caps.filter(x => x >= edge - 1e-9).length, n: caps.length }
}

export function computeFactors({ snap, permit, landColor, view, coastM }: ChanceInput): ChanceFactor[] {
  const out: { f: ChanceFactor; p: number }[] = []
  const add = (f: Omit<ChanceFactor, 'd'>, p: number) => out.push({ f: { ...f, d: p > 0 ? 1 : p < 0 ? -1 : 0 }, p })

  if (view) add({ k: 'view', s: view }, VIEW_POINTS[view])

  // Комплекс сам сдаётся — загрузка известна, а не взята у соседей.
  const own = snap.ownBooking
  if (own?.occupancy != null) add({ k: 'own', n: Math.round(own.occupancy * 100) }, 15)

  const land = landColorBucket(landColor)
  if (land === 'tourism') add({ k: 'land', s: 'tourism' }, 6)
  else if (land === 'residential') add({ k: 'land', s: 'residential' }, 0)
  else add({ k: 'land', s: 'unknown' }, -4)

  // Спрос: сколько объектов вокруг вообще сдаётся посуточно. Пороги — верхняя
  // четверть и нижняя десятая по каталогу (30.10.2026: медиана 262, p75 459, p10 85).
  const around = snap.totalCompetitorsInRadius
  if (around >= 400) add({ k: 'demand', n: around }, 6)
  else if (around < 100) add({ k: 'demand', n: around }, -8)

  // Сколько похожих рядом — уже в строке вероятности («у 8 из 9 похожих в 2 км»);
  // отдельная причина «формат» по другому подбору соседей спорила бы с ней.

  const pm = (permit ?? '').trim()
  if (/заявка/i.test(pm)) add({ k: 'permit', s: /SLF/i.test(pm) ? 'slf_applied' : 'pbg_applied' }, 0)
  else if (/SLF/i.test(pm)) add({ k: 'permit', s: 'slf' }, 10)
  else if (/PBG|IMB/i.test(pm)) add({ k: 'permit', s: 'pbg' }, 7)
  else add({ k: 'permit', s: 'none' }, -6)

  const lease = snap.villa.leaseholdYearsLeft
  if (lease != null && lease < 20) add({ k: 'lease', n: Math.round(lease) }, -5)

  const left = snap.villa.buildYearsLeft
  if (left === 0) add({ k: 'built', s: 'ready' }, 5)
  else if (left != null && left >= 2) add({ k: 'built', s: 'later', n: left }, -6)
  else if (left != null) add({ k: 'built', s: 'soon' }, -2)

  // Расстояние до берега — отдельной строкой, а не через радиус соседей
  // (владелец 31.10.2026). Плюс — только у самой воды; дальше — просто факт.
  if (coastM != null) add({ k: 'coast', n: Math.round(coastM / 10) * 10 }, coastM <= 500 ? 4 : 0)

  const infra = snap.infra?.composite
  if (infra != null) {
    if (infra >= 60) add({ k: 'place', s: 'lively' }, 5)
    else if (infra < 30) add({ k: 'place', s: 'quiet' }, -5)
  }

  // Сначала плюсы, потом нейтральные, потом минусы; внутри — по силе.
  out.sort((a, b) => b.p - a.p)
  return out.map(x => x.f)
}
