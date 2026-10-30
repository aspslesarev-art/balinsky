// «Вероятность N%» на Pro-карточке каталога: насколько уверенно объект
// заработает в своей вилке «от и до» (макет «Pro: доход от и до +
// вероятность», 30.10.2026). Это балл по правилам, а не статистическая
// вероятность: старт 50, каждая причина двигает его вверх или вниз, итог
// зажат в 15–90. Причины уходят на карточку списком «Почему?».
//
// Вес вида — по замеру booking_occ_drivers (3 692 виллы с разобранными фото,
// 14–30.10.2026, разница загрузки в п.п. внутри района и числа спален):
// джунгли +3,9, полный вид на океан +7,4, без вида −9,4, город −3,9, рисовые
// поля −0,7 (то есть не влияют). Баллы ≈ двойные п.п.
import type { InvestmentSnapshot } from './snapshot'
import { landColorBucket } from '../land-use'

export type ViewKind =
  | 'jungle' | 'ocean_full' | 'ocean_partial' | 'rice_field' | 'cliff'
  | 'mountain' | 'river_valley' | 'city' | 'garden' | 'none'

/** k — какая причина; d — в какую сторону; n/s — число или слово для текста. */
export type ChanceFactor = {
  k: 'view' | 'own' | 'land' | 'demand' | 'format' | 'permit' | 'lease' | 'built' | 'place'
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
  chance: number
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
  chanceMin: number
  chanceMax: number
  groups: { kind: 'villa' | 'apartment'; n: number; low: number; high: number }[]
}

const VIEW_POINTS: Record<ViewKind, number> = {
  ocean_full: 10, jungle: 8, cliff: 6, ocean_partial: 3, river_valley: 3, garden: 3,
  mountain: 2, rice_field: 0, city: -6, none: -10,
}

const BASE = 50
const MIN = 15
const MAX = 90

export type ChanceInput = {
  snap: InvestmentSnapshot
  /** Сырой «Разрешение» объекта (или комплекса): PBG, SLF, «Заявка PBG», «нет». */
  permit: string | null
  /** Сырой «Land color» объекта (у апартаментов — комплекса). */
  landColor: string | null
  view: ViewKind | null
}

export function computeChance({ snap, permit, landColor, view }: ChanceInput): { chance: number; factors: ChanceFactor[] } {
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

  // Уместность формата: сколько похожих (спальни, площадь, бассейн) рядом —
  // от этого зависит, насколько точно известна цена ночи.
  const similar = snap.matchSampleSize
  if (similar >= 15) add({ k: 'format', n: similar }, 6)
  else if (similar < 5) add({ k: 'format', n: similar }, -10)
  else add({ k: 'format', n: similar }, 0)

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

  const infra = snap.infra?.composite
  if (infra != null) {
    if (infra >= 60) add({ k: 'place', s: 'lively' }, 5)
    else if (infra < 30) add({ k: 'place', s: 'quiet' }, -5)
  }

  const chance = Math.max(MIN, Math.min(MAX, Math.round(BASE + out.reduce((a, x) => a + x.p, 0))))
  // Сначала плюсы, потом нейтральные, потом минусы; внутри — по силе.
  out.sort((a, b) => b.p - a.p)
  return { chance, factors: out.map(x => x.f) }
}
