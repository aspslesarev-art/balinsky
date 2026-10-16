// Доходность от ДОЛГОСРОЧНОЙ (помесячной) аренды.
//
// Для объектов на жилой (жёлтой) земле посуточная туристическая аренда
// нелегальна, и посуточный калькулятор там не показывается. Владелец такой
// виллы сдаёт её помесячно — это и считаем, по ставкам соседей с тем же
// числом спален из объявлений долгосрочной аренды (rumah123.com, выгрузка
// scripts/build-longterm-rent-comps.ts → Storage rental/_longterm_comps.json).
//
// Модель расходов отличается от посуточной:
//   • нет комиссии площадок и налога PHR — это расходы гостиничного бизнеса;
//   • коммунальные, уборку и расходники платит жилец; на владельце — бассейн,
//     сад и мелкий ремонт (те же доли расходов, что в посуточной модели);
//   • агент берёт комиссию с суммы договора;
//   • налог — финальный с валовой арендной платы: 10% для резидента
//     (PPh Final ст. 4(2), PP 34/2017), 20% для нерезидента (PPh 26).

import { cdnManifestUrl } from '../photo-cdn'
import { leaseholdIrr, type TaxStatus } from './economics'
import type { RegionDefaults } from './regions'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/rental/_longterm_comps.json`
const TTL_MS = 60 * 60 * 1000

/** Ступени радиуса и минимум объявлений, при котором медиане можно верить. */
const RADII_KM = [2, 3, 5, 8, 12] as const
const MIN_COMPS = 8

/** Сколько месяцев в году объект сдан: между жильцами бывает простой. */
export const MONTHS_RENTED = { bad: 10, median: 11, good: 12 } as const
/** Комиссия агента по долгосрочной аренде — с суммы договора. */
export const AGENT_FEE_PCT = 0.10

type RawItem = [number, number, number, number, number | null, string | null, string | null, string, string | null, (string | null)?]
type Manifest = { generatedAt: string; asOf?: string | null; source: string; items: RawItem[] }

export type MonthlyComp = {
  lat: number
  lng: number
  bedrooms: number
  rentMonthUsd: number
  buildingM2: number | null
  posted: string | null
  url: string | null
  title: string
  district: string | null
  /** Фото из объявления rumah123 (480×320). */
  photo: string | null
  distanceKm: number
}

export type MonthlyBundle = {
  p25: number
  p50: number
  p75: number
  n: number
  radiusKm: number
  /** true, если своих спален не хватило и взяли ±1 спальню. */
  bedroomsRelaxed: boolean
  source: string
  asOf: string
  comps: MonthlyComp[]
}

let _cache: { ts: number; data: Manifest | null } | null = null

async function loadManifest(): Promise<Manifest | null> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  try {
    // no-store: файл в 1,3 МБ, а кэш данных Next держал старую копию (без фото)
    // под тем же адресом; от частых загрузок бережёт _cache процесса.
    const r = await fetch(cdnManifestUrl(MANIFEST_URL, 3600), { cache: 'no-store' })
    const data = r.ok ? (await r.json()) as Manifest : null
    _cache = { ts: Date.now(), data }
    return data
  } catch {
    return _cache?.data ?? null
  }
}

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLng = (bLng - aLng) * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos), hi = Math.ceil(pos)
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo))
}

/** Ставки помесячной аренды похожих вилл вокруг точки. null — данных нет. */
export async function monthlyRentNear(lat: number, lng: number, bedrooms: number | null): Promise<MonthlyBundle | null> {
  const m = await loadManifest()
  if (!m?.items?.length) return null
  const beds = bedrooms ?? 2
  const all: MonthlyComp[] = m.items.map(i => ({
    lat: i[0], lng: i[1], bedrooms: i[2], rentMonthUsd: i[3], buildingM2: i[4],
    posted: i[5], url: i[6], title: i[7], district: i[8], photo: i[9] ?? null, distanceKm: km(lat, lng, i[0], i[1]),
  }))

  const pick = (radius: number, relaxed: boolean) => all
    .filter(c => c.distanceKm <= radius && (relaxed ? Math.abs(c.bedrooms - beds) <= 1 : c.bedrooms === beds))
    .sort((a, b) => a.distanceKm - b.distanceKm)

  let chosen: MonthlyComp[] = []
  let radiusKm: number = RADII_KM[0]
  let relaxed = false
  for (const r of RADII_KM) {
    chosen = pick(r, false); radiusKm = r
    if (chosen.length >= MIN_COMPS) break
  }
  if (chosen.length < MIN_COMPS) {
    const wider = pick(RADII_KM[RADII_KM.length - 1], true)
    if (wider.length > chosen.length) { chosen = wider; relaxed = true }
  }
  if (chosen.length < 3) return null

  const rents = chosen.map(c => c.rentMonthUsd).sort((a, b) => a - b)
  return {
    p25: quantile(rents, 0.25),
    p50: quantile(rents, 0.5),
    p75: quantile(rents, 0.75),
    n: chosen.length,
    radiusKm,
    bedroomsRelaxed: relaxed,
    source: m.source,
    asOf: m.asOf ?? m.generatedAt,
    // Для карточек — ближайшие с ценой около медианы и ссылкой.
    comps: chosen.filter(c => c.url).slice(0, 6),
  }
}

export type MonthlyEconomics = {
  rentMonth: number
  monthsRented: number
  revenue: number
  agentFee: number
  upkeep: number
  ffeReserve: number
  pbbTax: number
  tax: number
  taxRate: number
  noi: number
  entryPrice: number | null
  closingCost: number
  furnishing: number
  payback: number | null
  capRate: number | null
  leaseholdIrr: number | null
  capitalReturned: boolean | null
}

export type MonthlyInput = {
  rentMonth: number
  monthsRented: number
  agentFeePct: number
  area: number | null
  bedrooms: number | null
  askingPrice: number | null
  leaseholdYearsLeft: number | null
  taxStatus: TaxStatus
  region: RegionDefaults
}

export function computeMonthlyEconomics(i: MonthlyInput): MonthlyEconomics {
  const { region } = i
  const revenue = i.rentMonth * i.monthsRented
  const agentFee = revenue * i.agentFeePct
  // Расходы виллы — той же оценкой, что в посуточной модели, но на владельце
  // остаются только бассейн с садом и прочее (ремонт, связь); коммуналку,
  // уборку и расходники платит жилец.
  const opex = Math.max((i.area ?? 0) * region.opexPerSqmMonth * 12,
    region.opexFloorBase + region.opexFloorPerBedroom * (i.bedrooms ?? 2))
  const upkeep = opex * (region.opexBreakdown.poolGarden + region.opexBreakdown.other)
  const ffeReserve = revenue * region.ffeReservePct
  const pbbTax = i.askingPrice != null ? i.askingPrice * region.pbbAnnualPctOfPrice : 0
  // Налог с аренды в Индонезии финальный и берётся с валовой суммы.
  const taxRate = i.taxStatus === 'beforeTax' ? 0
    : i.taxStatus === 'resident' ? region.taxRateResident : region.taxRateNonResident
  const tax = revenue * taxRate
  const noi = Math.round(revenue - agentFee - upkeep - ffeReserve - pbbTax - tax)

  const closingCost = i.askingPrice != null ? i.askingPrice * region.closingCostPct : 0
  const furnishing = (i.area ?? 0) * region.furnishingPerSqm
  const entryPrice = i.askingPrice != null ? Math.round(i.askingPrice + closingCost + furnishing) : null
  const payback = entryPrice != null && noi > 0 ? entryPrice / noi : null
  const capRate = entryPrice != null && entryPrice > 0 ? noi / entryPrice : null
  const irr = entryPrice != null && i.leaseholdYearsLeft != null ? leaseholdIrr(entryPrice, noi, i.leaseholdYearsLeft) : null
  const capitalReturned = entryPrice != null && i.leaseholdYearsLeft != null
    ? noi > 0 && noi * i.leaseholdYearsLeft > entryPrice
    : null

  return {
    rentMonth: i.rentMonth, monthsRented: i.monthsRented,
    revenue: Math.round(revenue), agentFee: Math.round(agentFee), upkeep: Math.round(upkeep),
    ffeReserve: Math.round(ffeReserve), pbbTax: Math.round(pbbTax), tax: Math.round(tax), taxRate,
    noi, entryPrice, closingCost: Math.round(closingCost), furnishing: Math.round(furnishing),
    payback, capRate, leaseholdIrr: irr, capitalReturned,
  }
}
