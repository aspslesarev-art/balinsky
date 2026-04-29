export type RegionDefaults = {
  region: string
  currency: 'USD' | 'IDR' | 'RUB'
  occupancyByScenario: { bad: number; median: number; good: number }
  platformFeePct: number
  mgmtFeePct: number
  opexPerSqmMonth: number
  taxRate: number
  capRateThresholdWeak: number
}

export const BALI_DEFAULTS: RegionDefaults = {
  region: 'Bali',
  currency: 'USD',
  // Bands per editorial spec: low <55%, medium 55-70%, high 70-85%.
  // bad/median use band midpoints; good is pinned to 80% per editorial.
  occupancyByScenario: { bad: 0.50, median: 0.625, good: 0.80 },
  platformFeePct: 0.15,
  mgmtFeePct: 0.22,
  opexPerSqmMonth: 4,
  taxRate: 0.10,
  capRateThresholdWeak: 0.06,
}

export function regionFor(_lat: number, _lng: number): RegionDefaults {
  // Single-region MVP — всегда Бали
  return BALI_DEFAULTS
}
