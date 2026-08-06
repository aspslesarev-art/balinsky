// Developer safety index — "насколько рискованно покупать у этого застройщика".
//
// Deliberately built from *verifiable* facts about the developer's complexes
// (permits, land zoning, delivery track record, schedule slippage) rather than
// from the legacy Airtable rating columns. Those columns («Рейтинг Митюхина»,
// «П_Надежность», «Позиция») are manual RANK positions where 1 = best and the
// mass value 100/13 means "not ranked yet" — sorting them descending, as the
// «Сбалансированный» toggle used to, floats the *unrated* companies to the top.
//
// The score is intentionally NOT derived from «Юр-проверка: баланс» either:
// that contract audit exists for a single developer so far, and scoring on it
// would punish the only company we bothered to audit.
//
// Three buckets, in display order (see `SafetyBucket`):
//   rated    — has complexes in the catalogue → real 0–100 score
//   flagged  — no portfolio data, but carries an editorial risk flag
//   unrated  — nothing to judge on; parked at the bottom of the list
//
// Anything shown to the public is a neutral tier label — the internal risk
// notes in lib/developer-risk.ts stay internal.

import { developerRisk, type RiskSeverity } from './developer-risk'

export type SafetyBucket = 'rated' | 'flagged' | 'unrated'
export type SafetyTier = 'high' | 'good' | 'moderate' | 'low' | 'flagged' | 'unrated'

/** One complex, reduced to the fields that carry a safety signal. */
export type ComplexSafetyInput = {
  /** «Статус»: Построен / Строится / … */
  status: string | null
  /** «Разрешительные документы»: SLF / PBG / Заявка PBG / Заявка SLF / нет */
  permits: string | null
  /** «Land color»: Pink / Yellow / Red / Tourism / … */
  landColor: string | null
  /** «Year of completion » (note the trailing space in the source field). */
  completionYear: number | null
  /** «Q» — completion quarter, 1–4. */
  completionQuarter: number | null
  units: number
}

export type SafetyFactorKey = 'docs' | 'delivery' | 'schedule' | 'land'

export type SafetyFactor = {
  key: SafetyFactorKey
  /** 0–1, how well the developer does on this dimension. */
  ratio: number
  /** Points actually earned out of `max`. */
  points: number
  max: number
}

export type DeveloperSafety = {
  bucket: SafetyBucket
  tier: SafetyTier
  /** 0–100 for `rated`, null otherwise. */
  score: number | null
  factors: SafetyFactor[]
  complexes: number
  complexesReady: number
  /** Complexes past their announced handover date and still not built. */
  overdue: number
  /** Complexes with no building permit on file at all. */
  withoutPermits: number
}

const WEIGHTS: Record<SafetyFactorKey, number> = {
  docs: 35,
  delivery: 25,
  schedule: 25,
  land: 15,
}

// Delivery saturation points: a developer with 6 handed-over complexes or
// ~400 delivered units is a fully proven quantity as far as this index goes.
const DELIVERY_COMPLEX_SATURATION = 6
const DELIVERY_UNITS_SATURATION = 400

// Overcommitment: building a lot while having delivered nothing is the single
// most common way a Bali off-plan buyer gets burned.
const OVERCOMMIT_MIN_PROJECTS = 3
const OVERCOMMIT_PENALTY = 10
const IMBALANCE_RATIO = 3
const IMBALANCE_PENALTY = 5
const DEMOTED_PENALTY = 10

// A developer who has never handed a project over is unproven by definition:
// paperwork in order is necessary but not sufficient. Cap them below anyone
// with an actual delivery record, however thin that record's paperwork is.
const UNPROVEN_CAP = 62

// Editorial risk flags don't just subtract — they cap, so a big portfolio
// can't out-earn a known reputation problem.
const RISK_RULES: Record<RiskSeverity, { cap: number; penalty: number }> = {
  high: { cap: 35, penalty: 25 },
  medium: { cap: 55, penalty: 12 },
}

const TIER_THRESHOLDS: ReadonlyArray<readonly [number, SafetyTier]> = [
  [75, 'high'],
  [55, 'good'],
  [35, 'moderate'],
]

const COMPLETED_RE = /(построен|сдан|готов|complet|built)/i

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function isCompleted(status: string | null): boolean {
  return !!status && COMPLETED_RE.test(status)
}

/**
 * How much documentary comfort one complex gives, 0–1.
 * An already-built complex with no permit on file is the worst case there is;
 * an early-stage project without one is merely unproven.
 */
function permitWeight(permits: string | null, completed: boolean): number {
  const p = (permits ?? '').trim().toLowerCase()
  if (!p || p === 'нет' || p === 'no') return completed ? 0 : 0.15
  if (p.startsWith('заявка slf')) return 0.7
  if (p.startsWith('заявка pbg')) return 0.4
  if (p.startsWith('slf')) return 1
  if (p.startsWith('pbg')) return 0.85
  // Free-form editorial text ("Готовят пакет", "Отказ / пересмотр"…).
  if (/отказ|пересмотр|не завершено/i.test(p)) return 0.1
  if (/выдан/i.test(p)) return 0.9
  return 0.35
}

/** 0–1: is the land the complex sits on legally buildable for its purpose. */
function landWeight(landColor: string | null): number {
  const c = (landColor ?? '').trim()
  if (!c) return 0.45
  if (/\bred\b/i.test(c)) return 0
  if (/не определен|undefined/i.test(c)) return 0.45
  return 1
}

/** Absolute quarter index, so 2026 Q3 > 2025 Q4 with plain arithmetic. */
function quarterIndex(year: number, quarter: number): number {
  return year * 4 + (quarter - 1)
}

/**
 * 0–1 schedule discipline for one complex. Delivered = clean. Still building
 * past the announced quarter = progressively worse. No announced date at all
 * is not free either — an unverifiable promise scores below an honest one.
 */
function scheduleWeight(c: ComplexSafetyInput, nowIndex: number): number {
  if (isCompleted(c.status)) return 1
  if (!c.completionYear) return 0.6
  const quarter = c.completionQuarter && c.completionQuarter >= 1 && c.completionQuarter <= 4
    ? c.completionQuarter
    : 4
  const lateQuarters = nowIndex - quarterIndex(c.completionYear, quarter)
  if (lateQuarters <= 0) return 1
  if (lateQuarters <= 2) return 0.6
  if (lateQuarters <= 4) return 0.3
  return 0
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function tierForScore(score: number): SafetyTier {
  for (const [min, tier] of TIER_THRESHOLDS) {
    if (score >= min) return tier
  }
  return 'low'
}

export type DeveloperSafetyInput = {
  name: string
  complexes: ComplexSafetyInput[]
  /** «Понизить» — editor asked for this developer to be demoted. */
  demoted?: boolean
  /** Reference point for overdue detection; defaults to today. */
  now?: Date
}

export function scoreDeveloperSafety({
  name,
  complexes,
  demoted = false,
  now = new Date(),
}: DeveloperSafetyInput): DeveloperSafety {
  const risk = developerRisk(name)
  const nowIndex = quarterIndex(now.getFullYear(), Math.floor(now.getMonth() / 3) + 1)

  const ready = complexes.filter(c => isCompleted(c.status))
  const unitsReady = ready.reduce((s, c) => s + c.units, 0)
  const overdue = complexes.filter(
    c => !isCompleted(c.status) && c.completionYear != null && scheduleWeight(c, nowIndex) < 1,
  ).length
  const withoutPermits = complexes.filter(c => permitWeight(c.permits, isCompleted(c.status)) <= 0.15).length

  if (complexes.length === 0) {
    // Nothing verifiable. A known-problem company still outranks a blank one,
    // per the catalogue's ordering rule, but neither gets a number.
    const bucket: SafetyBucket = risk ? 'flagged' : 'unrated'
    return {
      bucket,
      tier: bucket,
      score: null,
      factors: [],
      complexes: 0,
      complexesReady: 0,
      overdue: 0,
      withoutPermits: 0,
    }
  }

  const docsRatio = average(complexes.map(c => permitWeight(c.permits, isCompleted(c.status))))
  const deliveryRatio = clamp01(
    0.65 * (Math.log1p(ready.length) / Math.log1p(DELIVERY_COMPLEX_SATURATION)) +
    0.35 * (Math.log1p(unitsReady) / Math.log1p(DELIVERY_UNITS_SATURATION)),
  )
  const scheduleRatio = average(complexes.map(c => scheduleWeight(c, nowIndex)))
  const landRatio = average(complexes.map(c => landWeight(c.landColor)))

  const ratios: Record<SafetyFactorKey, number> = {
    docs: docsRatio,
    delivery: deliveryRatio,
    schedule: scheduleRatio,
    land: landRatio,
  }
  const factors: SafetyFactor[] = (Object.keys(WEIGHTS) as SafetyFactorKey[]).map(key => ({
    key,
    ratio: clamp01(ratios[key]),
    points: Math.round(clamp01(ratios[key]) * WEIGHTS[key] * 10) / 10,
    max: WEIGHTS[key],
  }))

  const base = factors.reduce((s, f) => s + f.points, 0)

  const inProgress = complexes.length - ready.length
  const overcommitPenalty =
    ready.length === 0 && inProgress >= OVERCOMMIT_MIN_PROJECTS ? OVERCOMMIT_PENALTY
    : ready.length > 0 && inProgress > IMBALANCE_RATIO * ready.length ? IMBALANCE_PENALTY
    : 0
  const penalty = overcommitPenalty + (demoted ? DEMOTED_PENALTY : 0)

  const withPenalty = base - penalty
  const proven = ready.length > 0 ? withPenalty : Math.min(withPenalty, UNPROVEN_CAP)
  const capped = risk
    ? Math.min(proven - RISK_RULES[risk.severity].penalty, RISK_RULES[risk.severity].cap)
    : proven
  const score = Math.round(Math.min(100, Math.max(0, capped)))

  return {
    bucket: 'rated',
    tier: tierForScore(score),
    score,
    factors,
    complexes: complexes.length,
    complexesReady: ready.length,
    overdue,
    withoutPermits,
  }
}

const BUCKET_ORDER: Record<SafetyBucket, number> = { rated: 0, flagged: 1, unrated: 2 }

/**
 * Catalogue ordering: scored developers first (best → worst), then the ones we
 * know are problematic but have no portfolio on file, then the blanks.
 */
export function compareBySafety(
  a: { safety: DeveloperSafety; name: string },
  b: { safety: DeveloperSafety; name: string },
): number {
  const byBucket = BUCKET_ORDER[a.safety.bucket] - BUCKET_ORDER[b.safety.bucket]
  if (byBucket !== 0) return byBucket
  const byScore = (b.safety.score ?? 0) - (a.safety.score ?? 0)
  if (byScore !== 0) return byScore
  const byReady = b.safety.complexesReady - a.safety.complexesReady
  if (byReady !== 0) return byReady
  return a.name.localeCompare(b.name)
}
