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
  // Per editorial: bad <55% → 50%, median 55-70% → 65%, good 70-85% → 85%.
  occupancyByScenario: { bad: 0.50, median: 0.65, good: 0.85 },
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
