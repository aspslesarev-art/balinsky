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
  | 'jungle' | 'ocean' | 'ocean_full' | 'ocean_partial' | 'rice_field' | 'cliff'
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
  /** По соседям (рядом 2–3 км, мало — округа 10 км; radiusM): самая вероятная
   *  доходность (медиана, %), у половины соседей — от q25 до q75 (%), и сколько
   *  из n дотянули бы до low (kLow) и до high (kHigh). null — соседей с историей
   *  меньше пяти или помесячная сдача: тогда карточка показывает расчёт сайта. */
  odds: { likely: number; q25: number; q75: number; kLow: number; kHigh: number; n: number; radiusM: number } | null
  /** Самая вероятная по округе 10 км — «как вообще сдаются такие в районе». */
  area: { likely: number; n: number } | null
  /** С кем сравнивали: уровень подбора и поля юнита (pickSimilar). */
  match: Match | null
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
  // ocean — океан виден на фото, но полный это вид или краешек, разбор фото не
  // различает (а замер различает: полный +7,4 п., частичный −0,6) — середина.
  ocean_full: 10, jungle: 8, cliff: 6, ocean: 4, ocean_partial: 3, river_valley: 3, garden: 3,
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

/** Сосед на Booking: медианная цена ночи ($) и загрузка (%) за всё время сбора,
 *  плюс поля варианта с той же спальностью (booking_room_facts). */
export type NeighbourPerf = { price: number; occupancy: number; privatePool: boolean | null; sizeM2: number | null }

/** Юнит в формате Booking — то, по чему его сравнивают (listing_profile). */
export type UnitProfile = {
  unitKind: 'villa' | 'apartment'; bedrooms: number | null; areaM2: number | null; privatePool: boolean | null
  /** Цена ночи объекта по расчёту сайта, $ — мерило класса (см. CLASS_MIN/MAX). */
  classAdr: number | null
}

/** Каких соседей взяли: только тип и спальни; + площадь; + бассейн; + оба. */
export type MatchLevel = 'type' | 'area' | 'pool' | 'pool_area'
/** c — коридор цены ночи соседей «того же класса», $; null — класс не отбирали
 *  (таких соседей меньше пяти, сравнили со всеми). */
export type Match = { l: MatchLevel; k: 'villa' | 'apartment'; b: number | null; p: boolean | null; a: number | null; c: [number, number] | null }

// Площадь «похожая» — от 0,6 до 1,6 раза: у вилл в Booking часто вписан дом с
// участком, у нас — дом, поэтому окно широкое.
const AREA_MIN = 0.6
const AREA_MAX = 1.6
// Тот же класс — цена ночи соседа от половины до двух цен ночи объекта
// (владелец 31.10.2026: у Oceaniq 2 за $263 в соседях были виллы за $28 —
// другой класс тянул «самую вероятную» вниз). Мерило — цена ночи из расчёта
// сайта; середина внутри коридора — уже по реальным соседям.
const CLASS_MIN = 0.5
const CLASS_MAX = 2

/**
 * Самые похожие соседи, которых хватает для расчёта (не меньше пяти). Сначала
 * тот же класс (цена ночи), внутри него — тот же бассейн и похожая площадь → тот же бассейн → похожая площадь →
 * просто тип и спальни. Неизвестный бассейн или площадь у нас — ступень
 * пропускаем (у большинства вилл бассейн не указан и не виден на фото).
 */
export function pickSimilar(all: NeighbourPerf[], u: UnitProfile): { rows: NeighbourPerf[]; match: Match } {
  let rows = all
  let band: [number, number] | null = null
  if (u.classAdr != null && u.classAdr > 0) {
    const lo = u.classAdr * CLASS_MIN, hi = u.classAdr * CLASS_MAX
    const same = all.filter(r => r.price >= lo && r.price <= hi)
    if (same.length >= MIN_NEIGHBOURS) { rows = same; band = [Math.round(lo), Math.round(hi)] }
  }
  const m = (l: MatchLevel): Match => ({ l, k: u.unitKind, b: u.bedrooms, p: u.privatePool, a: u.areaM2, c: band })
  const area = u.areaM2
  const closeArea = (xs: NeighbourPerf[]) => area == null ? [] : xs.filter(r => r.sizeM2 != null && r.sizeM2 >= area * AREA_MIN && r.sizeM2 <= area * AREA_MAX)
  if (u.privatePool != null) {
    const samePool = rows.filter(r => r.privatePool === u.privatePool)
    const both = closeArea(samePool)
    if (both.length >= MIN_NEIGHBOURS) return { rows: both, match: m('pool_area') }
    if (samePool.length >= MIN_NEIGHBOURS) return { rows: samePool, match: m('pool') }
  }
  const byArea = closeArea(rows)
  if (byArea.length >= MIN_NEIGHBOURS) return { rows: byArea, match: m('area') }
  return { rows, match: m('type') }
}

/** Что дали бы объекту похожие соседи: самая вероятная доходность (медиана),
 *  середина разброса (у половины соседей) и сколько из них дотянули бы до
 *  нижней и до верхней границы вилки. Доли — 0..1. */
export type NeighbourStats = { n: number; kLow: number; kHigh: number; p25: number; p50: number; p75: number }

const quantile = (xs: number[], q: number) => {
  const pos = (xs.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos)
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)
}

/**
 * Доходность, которую каждый сосед своей ценой ночи и загрузкой дал бы этому
 * объекту. Всё остальное (площадка, управление, расходы, цена входа) — этого
 * объекта, как в средней колонке сценариев на странице объекта.
 */
export function neighbourStats(snap: InvestmentSnapshot, lowCap: number, highCap: number, rows: NeighbourPerf[]): NeighbourStats | null {
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
  caps.sort((a, b) => a - b)
  // Сравниваем с округлёнными границами — теми, что видит человек на карточке.
  const r3 = (x: number) => Math.round(x * 1000) / 1000
  const lo = r3(lowCap), hi = r3(highCap)
  return {
    n: caps.length,
    kLow: caps.filter(x => x >= lo - 1e-9).length,
    kHigh: caps.filter(x => x >= hi - 1e-9).length,
    p25: quantile(caps, 0.25), p50: quantile(caps, 0.5), p75: quantile(caps, 0.75),
  }
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
