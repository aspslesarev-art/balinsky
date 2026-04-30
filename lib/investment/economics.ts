import type { CompetitorWithDistance } from '../competitor-utils'
import type { RegionDefaults } from './regions'

export type ScenarioKey = 'bad' | 'median' | 'good'

export type Economics = {
  adr: number
  occupancy: number
  revenue: number
  platformFee: number
  mgmtFee: number
  opex: number
  taxableBase: number
  tax: number
  noi: number
  payback: number | null
  capRate: number | null
  leaseholdRisk: boolean
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

export type EconomicsInput = {
  adr: number
  occupancy: number
  area: number | null
  askingPrice: number | null
  leaseholdYearsLeft: number | null
  region: RegionDefaults
}

export function computeEconomics(input: EconomicsInput): Economics {
  const { adr, occupancy, area, askingPrice, leaseholdYearsLeft, region } = input
  const revenue = adr * 365 * occupancy
  const platformFee = revenue * region.platformFeePct
  const mgmtFee = revenue * region.mgmtFeePct
  const opex = (area ?? 0) * region.opexPerSqmMonth * 12
  const taxableBase = Math.max(0, revenue - platformFee - mgmtFee - opex)
  const tax = taxableBase * region.taxRate
  const noi = revenue - platformFee - mgmtFee - opex - tax
  const payback = askingPrice != null && noi > 0 ? askingPrice / noi : null
  const capRate = askingPrice != null && askingPrice > 0 ? noi / askingPrice : null
  const leaseholdRisk = !!(leaseholdYearsLeft != null && payback != null && payback > leaseholdYearsLeft)
  return {
    adr: Math.round(adr),
    occupancy,
    revenue: Math.round(revenue),
    platformFee: Math.round(platformFee),
    mgmtFee: Math.round(mgmtFee),
    opex: Math.round(opex),
    taxableBase: Math.round(taxableBase),
    tax: Math.round(tax),
    noi: Math.round(noi),
    payback,
    capRate,
    leaseholdRisk,
  }
}

export type ScenarioBundle = Record<ScenarioKey, Economics>

export function buildScenarios(
  pcts: AdrPercentiles,
  base: Omit<EconomicsInput, 'adr' | 'occupancy'>,
  occupancyByScenario: { bad: number; median: number; good: number },
): ScenarioBundle {
  return {
    bad: computeEconomics({ ...base, adr: pcts.p25, occupancy: occupancyByScenario.bad }),
    median: computeEconomics({ ...base, adr: pcts.p50, occupancy: occupancyByScenario.median }),
    good: computeEconomics({ ...base, adr: pcts.p75, occupancy: occupancyByScenario.good }),
  }
}
