import type { CompetitorWithDistance } from '../competitor-utils'
import type { RegionDefaults } from './regions'

export type ScenarioKey = 'bad' | 'median' | 'good'
export type TaxStatus = 'resident' | 'nonResident'

export type Economics = {
  /** Ставка соседей после коэффициента реализации — то, что реально получают. */
  adr: number
  /** Медиана ставки соседей до дисконта — для показа «откуда взялось». */
  adrAsking: number
  occupancy: number
  revenue: number
  platformFee: number
  phrTax: number
  mgmtFee: number
  opex: number
  /** true, если расходы упёрлись в базовый минимум, а не в оценку по площади. */
  opexAtFloor: boolean
  ffeReserve: number
  preTaxProfit: number
  tax: number
  taxStatus: TaxStatus
  noi: number
  /** Цена объекта + оформление + меблировка. Доходность считается от неё. */
  entryPrice: number | null
  closingCost: number
  furnishing: number
  payback: number | null
  capRate: number | null
  leaseholdRisk: boolean
  /** Доходность за срок лизхолда с нулевой остаточной стоимостью. */
  leaseholdIrr: number | null
  /** false, когда сумма всех поступлений за срок лиза меньше вложенного. */
  capitalReturned: boolean | null
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos), hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export type AdrPercentiles = { p25: number; p50: number; p75: number; min: number; max: number; avg: number }

export function adrPercentiles(matches: CompetitorWithDistance[]): AdrPercentiles {
  const sorted = matches.map(m => m.price).sort((a, b) => a - b)
  if (sorted.length === 0) return { p25: 0, p50: 0, p75: 0, min: 0, max: 0, avg: 0 }
  return {
    p25: Math.round(quantile(sorted, 0.25)),
    p50: Math.round(quantile(sorted, 0.50)),
    p75: Math.round(quantile(sorted, 0.75)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length),
  }
}

/**
 * Внутренняя доходность потока «заплатили один раз — получаем NOI каждый год
 * в течение срока лизхолда — в конце ноль». Ноль в конце не пессимизм, а
 * устройство leasehold: право истекает и объект возвращается владельцу земли.
 * Возвращает null, когда сумма всех поступлений меньше вложенного — тогда
 * ставки, при которой поток окупается, просто не существует.
 */
export function leaseholdIrr(entryPrice: number, noi: number, years: number): number | null {
  if (!(entryPrice > 0) || !(noi > 0) || !(years > 0)) return null
  if (noi * years <= entryPrice) return null
  const npv = (r: number): number => {
    let v = -entryPrice
    for (let t = 1; t <= years; t++) v += noi / (1 + r) ** t
    return v
  }
  let lo = 0, hi = 1
  if (npv(hi) > 0) return hi
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2
    if (npv(mid) > 0) lo = mid; else hi = mid
  }
  return (lo + hi) / 2
}

export type EconomicsInput = {
  /** Ставка соседей как она стоит в выдаче — дисконт применяется внутри. */
  adr: number
  occupancy: number
  adrRealization: number
  phrOwnerShare: number
  area: number | null
  bedrooms: number | null
  askingPrice: number | null
  leaseholdYearsLeft: number | null
  taxStatus: TaxStatus
  /** Объект меблирован застройщиком — меблировка не входит в цену входа. */
  furnished?: boolean
  region: RegionDefaults
}

export function computeEconomics(input: EconomicsInput): Economics {
  const {
    adr: adrAsking, occupancy, adrRealization, phrOwnerShare,
    area, bedrooms, askingPrice, leaseholdYearsLeft, taxStatus, furnished, region,
  } = input

  const adr = adrAsking * adrRealization
  const revenue = adr * 365 * occupancy

  const platformFee = revenue * region.platformFeePct
  const phrTax = revenue * region.phrRatePct * phrOwnerShare
  const mgmtFee = revenue * region.mgmtFeePct

  const opexByArea = (area ?? 0) * region.opexPerSqmMonth * 12
  const opexFloor = region.opexFloorBase + region.opexFloorPerBedroom * (bedrooms ?? 2)
  const opex = Math.max(opexByArea, opexFloor)
  const opexAtFloor = opexFloor > opexByArea

  const ffeReserve = revenue * region.ffeReservePct

  const preTaxProfit = revenue - platformFee - phrTax - mgmtFee - opex - ffeReserve
  const taxRate = taxStatus === 'resident' ? region.taxRateResident : region.taxRateNonResident
  const tax = Math.max(0, preTaxProfit) * taxRate
  const noi = preTaxProfit - tax

  const closingCost = askingPrice != null ? askingPrice * region.closingCostPct : 0
  const furnishing = furnished ? 0 : (area ?? 0) * region.furnishingPerSqm

  // Доходность считается от тех же округлённых чисел, которые виджет
  // показывает в разбивке: иначе покупатель делит одно на другое вручную
  // и не сходится с подписанным процентом.
  const noiR = Math.round(noi)
  const entryPrice = askingPrice != null ? Math.round(askingPrice + closingCost + furnishing) : null

  const payback = entryPrice != null && noiR > 0 ? entryPrice / noiR : null
  const capRate = entryPrice != null && entryPrice > 0 ? noiR / entryPrice : null
  const irr = entryPrice != null && leaseholdYearsLeft != null
    ? leaseholdIrr(entryPrice, noiR, leaseholdYearsLeft)
    : null
  const capitalReturned = entryPrice != null && leaseholdYearsLeft != null
    ? noiR > 0 && noiR * leaseholdYearsLeft > entryPrice
    : null
  const leaseholdRisk = !!(leaseholdYearsLeft != null && (payback == null || payback > leaseholdYearsLeft))

  return {
    adr: Math.round(adr),
    adrAsking: Math.round(adrAsking),
    occupancy,
    revenue: Math.round(revenue),
    platformFee: Math.round(platformFee),
    phrTax: Math.round(phrTax),
    mgmtFee: Math.round(mgmtFee),
    opex: Math.round(opex),
    opexAtFloor,
    ffeReserve: Math.round(ffeReserve),
    preTaxProfit: Math.round(preTaxProfit),
    tax: Math.round(tax),
    taxStatus,
    noi: noiR,
    entryPrice,
    closingCost: Math.round(closingCost),
    furnishing: Math.round(furnishing),
    payback,
    capRate,
    leaseholdRisk,
    leaseholdIrr: irr,
    capitalReturned,
  }
}

export type ScenarioBundle = Record<ScenarioKey, Economics>

export function buildScenarios(
  pcts: AdrPercentiles,
  base: Omit<EconomicsInput, 'adr' | 'occupancy' | 'adrRealization' | 'phrOwnerShare'>,
  occupancyByScenario: { bad: number; median: number; good: number },
): ScenarioBundle {
  const { region } = base
  const mk = (adr: number, key: ScenarioKey): Economics => computeEconomics({
    ...base,
    adr,
    occupancy: occupancyByScenario[key],
    adrRealization: region.adrRealizationByScenario[key],
    phrOwnerShare: region.phrOwnerShareByScenario[key],
  })
  return { bad: mk(pcts.p25, 'bad'), median: mk(pcts.p50, 'median'), good: mk(pcts.p75, 'good') }
}
