import { computeEconomics } from './economics'
import { AGENT_FEE_PCT, MONTHS_RENTED, computeMonthlyEconomics } from './monthly'
import type { InvestmentSnapshot } from './snapshot'

// «Чек» для вкладок «Будет ли спрос?» (владелец 23.10.2026): что остаётся
// с одной сданной ночи (посуточно) или одного сданного месяца (помесячно)
// после всех расходов и какая часть этого лишь возвращает вложенное. Те же
// модели, что у калькуляторов (средний сценарий), разложенные на одну
// сданную ночь или месяц.

type Snap = Pick<InvestmentSnapshot, 'villa' | 'region' | 'scenarios' | 'ownBooking' | 'monthly'>

export type ReceiptLine = {
  key: 'discount' | 'platform' | 'mgmt' | 'agent' | 'taxes' | 'rentTax' | 'upkeep' | 'ownerUpkeep'
  value: number
  /** Процент модели — для подписи строки. */
  pct?: number
}

export type Receipt = {
  unit: 'night' | 'month'
  /** Цена на витрине, за которую считаем. */
  guest: number
  /** true — цена этого комплекса на Booking, false — средняя у соседей. */
  ownRate: boolean
  lines: ReceiptLine[]
  /** На руки с одной сданной ночи / месяца = guest минус строки. */
  net: number
  /** Сколько из net возвращает вложенное (цена + оформление + мебель). */
  payback: number
  /** Посуточно — загрузка, %; помесячно — сдано месяцев из 12. */
  occupancyPct: number
  monthsRented: number
  /** На руки в месяц (в среднем за год) и заработок сверх возврата вложенного. */
  month: number
  monthEarn: number
  /** Ниже этой цены не возвращается даже вложенное. */
  breakeven: number | null
  entryPrice: number
  leaseYears: number
  buildYears: number
}

function base(snap: Snap) {
  const price = snap.villa.askingPrice
  const lease = snap.villa.leaseholdYearsLeft
  const build = Math.min(snap.villa.buildYearsLeft ?? 0, lease ?? 0)
  if (price == null || !(price > 0) || lease == null || !(lease - build > 0)) return null
  return { price, lease, build, years: lease - build }
}

function setupDaily(snap: Snap) {
  const b = base(snap)
  const occupancy = snap.ownBooking?.occupancy ?? snap.region.occupancyByScenario.median
  if (!b || !(occupancy > 0)) return null
  const r = snap.region
  const econ = (adr: number) => computeEconomics({
    adr, occupancy,
    adrRealization: r.adrRealizationByScenario.median,
    phrOwnerShare: r.phrOwnerShareByScenario.median,
    area: snap.villa.area, bedrooms: snap.villa.bedrooms,
    askingPrice: b.price, leaseholdYearsLeft: b.lease,
    taxStatus: 'nonResident', region: r,
  })
  return { ...b, econ, occupancy, sold: 365 * occupancy }
}

function setupMonthly(snap: Snap) {
  const b = base(snap)
  if (!b) return null
  const months = MONTHS_RENTED.median
  const econ = (rent: number) => computeMonthlyEconomics({
    rentMonth: rent, monthsRented: months, agentFeePct: AGENT_FEE_PCT,
    area: snap.villa.area, bedrooms: snap.villa.bedrooms,
    askingPrice: b.price, leaseholdYearsLeft: b.lease,
    taxStatus: 'nonResident', region: snap.region,
  })
  return { ...b, econ, months }
}

/** На руки в месяц, если сдавать по этой цене (за ночь или за месяц). */
export function monthlyNetAt(snap: Snap, price: number, unit: 'night' | 'month' = 'night'): number | null {
  const s = unit === 'night' ? setupDaily(snap) : setupMonthly(snap)
  return s ? Math.round(s.econ(price).noi / 12) : null
}

/** Цена, при которой год возвращает только вложенное: noi растёт с ценой монотонно. */
function breakevenOf(noiAt: (p: number) => number, capitalPerYear: number, max: number): number | null {
  if (noiAt(max) < capitalPerYear) return null
  let lo = 0, hi = max
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (noiAt(mid) >= capitalPerYear) hi = mid
    else lo = mid
  }
  return Math.round(hi)
}

export function nightReceipt(snap: Snap): Receipt | null {
  const s = setupDaily(snap)
  const own = snap.ownBooking?.adr ?? null
  const guest = own ?? snap.scenarios?.median.adrAsking ?? null
  if (!s || guest == null || !(guest > 0)) return null
  const e = s.econ(guest)
  if (e.entryPrice == null) return null
  const per = (x: number) => Math.round(x / s.sold)
  const r = snap.region
  const lines: ReceiptLine[] = [
    { key: 'discount', value: guest - e.adr, pct: Math.round((1 - r.adrRealizationByScenario.median) * 100) },
    { key: 'platform', value: per(e.platformFee), pct: Math.round(r.platformFeePct * 100) },
    { key: 'mgmt', value: per(e.mgmtFee), pct: Math.round(r.mgmtFeePct * 100) },
    { key: 'taxes', value: per(e.phrTax + e.tax) },
    { key: 'upkeep', value: per(e.opex + e.ffeReserve + e.pbbTax) },
  ]
  const capitalPerYear = e.entryPrice / s.years
  return {
    unit: 'night', guest, ownRate: own != null, lines,
    // Остаток — вычитанием округлённых строк, чтобы чек сходился.
    net: guest - lines.reduce((t, l) => t + l.value, 0),
    payback: Math.round(capitalPerYear / s.sold),
    occupancyPct: Math.round(s.occupancy * 100),
    monthsRented: 12,
    month: Math.round(e.noi / 12),
    monthEarn: Math.round((e.noi - capitalPerYear) / 12),
    breakeven: breakevenOf(p => s.econ(p).noi, capitalPerYear, 10000),
    entryPrice: e.entryPrice, leaseYears: s.lease, buildYears: s.build,
  }
}

export function monthReceipt(snap: Snap): Receipt | null {
  const s = setupMonthly(snap)
  const rent = snap.monthly?.p50 ?? null
  if (!s || rent == null || !(rent > 0)) return null
  const e = s.econ(rent)
  if (e.entryPrice == null) return null
  const per = (x: number) => Math.round(x / s.months)
  const lines: ReceiptLine[] = [
    { key: 'agent', value: per(e.agentFee), pct: Math.round(AGENT_FEE_PCT * 100) },
    { key: 'rentTax', value: per(e.tax), pct: Math.round(e.taxRate * 100) },
    { key: 'ownerUpkeep', value: per(e.upkeep + e.ffeReserve + e.pbbTax) },
  ]
  const capitalPerYear = e.entryPrice / s.years
  return {
    unit: 'month', guest: rent, ownRate: false, lines,
    net: rent - lines.reduce((t, l) => t + l.value, 0),
    payback: Math.round(capitalPerYear / s.months),
    occupancyPct: Math.round((s.months / 12) * 100),
    monthsRented: s.months,
    month: Math.round(e.noi / 12),
    monthEarn: Math.round((e.noi - capitalPerYear) / 12),
    breakeven: breakevenOf(p => s.econ(p).noi, capitalPerYear, 200000),
    entryPrice: e.entryPrice, leaseYears: s.lease, buildYears: s.build,
  }
}
