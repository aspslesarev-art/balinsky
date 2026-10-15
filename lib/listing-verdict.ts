// «Стоит ли брать»: четыре вопроса новичка (безопасно? удобно? спрос?
// сколько принесёт?) с ответом по данным объекта. Только факты из базы —
// где данных нет, вывод не делается, а не угадывается.
//
// Доходность считается теми же функциями и с теми же настройками по
// умолчанию, что и калькулятор на странице, — иначе цифра в итоге и в
// калькуляторе разойдутся.
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { buildSnapshot, type InvestmentSnapshot } from './investment/snapshot'
import { computeEconomics, type TaxStatus } from './investment/economics'
import { computeMonthlyEconomics, MONTHS_RENTED, AGENT_FEE_PCT } from './investment/monthly'
import type { Climate } from './complex-access'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export type Tone = 'plus' | 'warn' | 'minus'

// Снимок для калькулятора тяжёлый (соседи, карта), а страница его
// перестраивала бы на каждый запрос — держим час, правка объекта бампает тег.
export const loadVerdictSnapshot = (id: string) => unstable_cache(
  async () => buildSnapshot(id, 'villa'),
  ['verdict-snapshot-v1', id],
  { revalidate: 3600, tags: ['content:villas'] },
)().catch(() => null)

export type ComplexFacts = {
  readiness: number | null
  paymentPlan: string | null
  leaseExtension: number | null
  permitDocs: string | null
  units: number | null
}

// Поля проекта, которых нет у юнита: готовность, рассрочка, продление аренды.
export async function loadComplexFacts(complexId: string | null): Promise<ComplexFacts | null> {
  if (!complexId) return null
  const { data, error } = await sb
    .from('raw_complexes')
    // Одна строка проекта — data целиком дешевле, чем экранировать в select
    // имя поля с запятой («Payment plan,%»).
    .select('data')
    .eq('airtable_id', complexId)
    .maybeSingle()
  if (error || !data) return null
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : NaN
    return Number.isFinite(n) && String(v).trim() !== '' ? n : null
  }
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const row = (data as { data: Record<string, unknown> }).data ?? {}
  return {
    readiness: num(row['Готовность']),
    paymentPlan: str(row['Payment plan,%']),
    leaseExtension: num(row['Leashold продление']),
    permitDocs: str(row['Разрешительные документы']),
    units: num(row['Total quantity of units']),
  }
}

export type YieldFacts = {
  mode: 'monthly' | 'daily'
  /** Ставка, от которой считали: аренда в месяц или ночь, USD. */
  rateUsd: number
  pct: Record<TaxStatus, number>
  noiBeforeTaxUsd: number
  paybackYears: number | null
  /** Сколько вложений вернёт аренда за весь срок лизхолда, до налогов. */
  leaseMultiple: number | null
}

export function computeYieldFacts(snap: InvestmentSnapshot | null): YieldFacts | null {
  if (!snap || snap.villa.askingPrice == null) return null
  const v = snap.villa
  const restricted = snap.flags.rentalRestricted || !snap.scenarios
  if (restricted) {
    const m = snap.monthly
    if (!m) return null
    const calc = (taxStatus: TaxStatus) => computeMonthlyEconomics({
      rentMonth: m.p50, monthsRented: MONTHS_RENTED.median, agentFeePct: AGENT_FEE_PCT,
      area: v.area, bedrooms: v.bedrooms, askingPrice: v.askingPrice,
      leaseholdYearsLeft: v.leaseholdYearsLeft, taxStatus, region: snap.region,
    })
    const b = calc('beforeTax')
    if (b.capRate == null || b.entryPrice == null) return null
    return {
      mode: 'monthly', rateUsd: m.p50,
      pct: { beforeTax: b.capRate, resident: calc('resident').capRate ?? 0, nonResident: calc('nonResident').capRate ?? 0 },
      noiBeforeTaxUsd: b.noi,
      paybackYears: b.payback,
      leaseMultiple: v.leaseholdYearsLeft != null && b.entryPrice > 0 ? (b.noi * v.leaseholdYearsLeft) / b.entryPrice : null,
    }
  }
  const sc = snap.scenarios!
  const calc = (taxStatus: TaxStatus) => computeEconomics({
    adr: sc.median.adrAsking,
    occupancy: snap.region.occupancyByScenario.median,
    adrRealization: snap.region.adrRealizationByScenario.median,
    phrOwnerShare: snap.region.phrOwnerShareByScenario.median,
    area: v.area, bedrooms: v.bedrooms, askingPrice: v.askingPrice,
    leaseholdYearsLeft: v.leaseholdYearsLeft, taxStatus, region: snap.region,
  })
  const b = calc('beforeTax')
  if (b.capRate == null || b.entryPrice == null) return null
  return {
    mode: 'daily', rateUsd: sc.median.adrAsking,
    pct: { beforeTax: b.capRate, resident: calc('resident').capRate ?? 0, nonResident: calc('nonResident').capRate ?? 0 },
    noiBeforeTaxUsd: b.noi,
    paybackYears: b.payback,
    leaseMultiple: v.leaseholdYearsLeft != null && b.entryPrice > 0 ? (b.noi * v.leaseholdYearsLeft) / b.entryPrice : null,
  }
}

// Терцили времени до аэропорта по всем 1360 объектам (listing_geo_facts,
// 15.10.2026): треть ближе 36 минут, треть дальше 56.
const AIRPORT_NEAR_MIN = 36
const AIRPORT_FAR_MIN = 56
// Классы InaRISK: ниже 0,333 — низкий риск, выше 0,666 — высокий.
const HAZARD_MEDIUM = 0.333
const HAZARD_HIGH = 0.666

export type VerdictInput = {
  status: string | null
  yearRaw: string | null
  permit: string | null
  leaseYears: number | null
  rentalRestricted: boolean
  complex: ComplexFacts | null
  dev: { name: string | null; total: number; ready: number } | null
  climate: Climate | null
  airportMin: number | null
  monthly: { n: number; p25: number; p50: number; p75: number; radiusKm: number } | null
  daily: { count: number; adrUsd: number | null; occupancyPct: number | null } | null
  yields: YieldFacts | null
  saleDiffPct: number | null
  hasPool: boolean | null
}

export type Verdict = {
  safety: { tone: Tone; permitMissing: boolean; notStarted: boolean; noFinishedProjects: boolean; hazards: { key: string; level: 'none' | 'low' | 'medium' | 'high' }[] }
  comfort: { tone: Tone; airportMin: number | null; airportBand: 'near' | 'mid' | 'far' | null; flat: boolean | null; roadM: number | null }
  demand: { tone: Tone; monthlyOnly: boolean }
  money: { tone: Tone; pct: number | null }
  /** Сколько процентов прибавилось зданий в радиусе 1 км с первого года наблюдений. */
  buildingsGrowthPct: number | null
  pluses: ('pool' | 'smallComplex' | 'installments' | 'flat' | 'cheaper' | 'nearAirport' | 'strongYield')[]
  checks: ('permit' | 'lease' | 'delays' | 'zoneMonthly')[]
}

const NOT_STARTED_RE = /строит|under construction|planned|проект|котлован/i

export function buildVerdict(i: VerdictInput): Verdict {
  // «нет» в поле разрешения — застройщик сам указал, что документов нет.
  const permitRaw = (i.permit ?? i.complex?.permitDocs ?? '').trim().toLowerCase()
  const permitMissing = permitRaw === 'нет' || permitRaw === 'no'
  const underConstruction = !!i.status && NOT_STARTED_RE.test(i.status)
  const notStarted = underConstruction && i.complex?.readiness === 0
  const noFinishedProjects = !!i.dev && i.dev.total > 0 && i.dev.ready === 0

  const hz = i.climate?.hazards
  const level = (v: number | null | undefined): 'none' | 'low' | 'medium' | 'high' =>
    v == null ? 'none' : v >= HAZARD_HIGH ? 'high' : v >= HAZARD_MEDIUM ? 'medium' : 'low'
  const hazards = hz
    ? (['flood', 'flash_flood', 'landslide', 'tsunami', 'volcano', 'earthquake'] as const).map(key => ({ key, level: level(hz[key]) }))
    : []
  const badNature = hazards.some(h => h.key !== 'earthquake' && h.level === 'high')
  const docRisks = [permitMissing, notStarted, noFinishedProjects].filter(Boolean).length
  const safetyTone: Tone = permitMissing || docRisks >= 2 || badNature ? 'minus' : docRisks === 1 ? 'warn' : 'plus'

  const plot = i.climate?.plot
  const flat = plot?.slope_pct != null ? plot.slope_pct < 8 : null
  const airportBand = i.airportMin == null ? null : i.airportMin <= AIRPORT_NEAR_MIN ? 'near' : i.airportMin <= AIRPORT_FAR_MIN ? 'mid' : 'far'
  const comfortTone: Tone = airportBand === 'near' ? 'plus' : airportBand === 'far' ? 'minus' : 'warn'

  const monthlyOnly = i.rentalRestricted
  const demandTone: Tone = monthlyOnly
    ? (i.monthly && i.monthly.n >= 10 ? 'warn' : 'minus')
    : (i.daily && i.daily.count >= 5 && (i.daily.occupancyPct ?? 0) >= 70 ? 'plus' : 'warn')

  const pct = i.yields?.pct.beforeTax ?? null
  const moneyTone: Tone = pct == null ? 'warn' : pct >= 0.08 ? 'plus' : pct >= 0.06 ? 'warn' : 'minus'

  const yrs = i.climate?.buildings?.years
  const ys = yrs ? Object.keys(yrs).sort() : []
  const first = ys.length ? yrs![ys[0]].n : 0
  const last = ys.length ? yrs![ys[ys.length - 1]].n : 0
  const buildingsGrowthPct = first > 0 && ys.length > 1 ? Math.round((last / first - 1) * 100) : null

  const pluses: Verdict['pluses'] = []
  if (i.hasPool) pluses.push('pool')
  if (i.complex?.units != null && i.complex.units <= 10) pluses.push('smallComplex')
  if (i.complex?.paymentPlan && /\d+\s*%\s*\+/.test(i.complex.paymentPlan)) pluses.push('installments')
  if (flat) pluses.push('flat')
  if (i.saleDiffPct != null && i.saleDiffPct <= -5) pluses.push('cheaper')
  if (airportBand === 'near') pluses.push('nearAirport')
  if (moneyTone === 'plus') pluses.push('strongYield')

  const checks: Verdict['checks'] = []
  if (permitMissing || underConstruction) checks.push('permit')
  if (i.leaseYears != null) checks.push('lease')
  if (underConstruction) checks.push('delays')
  if (monthlyOnly) checks.push('zoneMonthly')

  return {
    safety: { tone: safetyTone, permitMissing, notStarted, noFinishedProjects, hazards },
    comfort: { tone: comfortTone, airportMin: i.airportMin, airportBand, flat, roadM: plot?.road.m ?? null },
    demand: { tone: demandTone, monthlyOnly },
    money: { tone: moneyTone, pct },
    buildingsGrowthPct,
    pluses,
    checks,
  }
}
