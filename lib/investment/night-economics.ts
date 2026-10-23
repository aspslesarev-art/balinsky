import { computeEconomics } from './economics'
import type { InvestmentSnapshot } from './snapshot'

// «Чек одной ночи» для «Будет ли спрос → Посуточно» (владелец 23.10.2026):
// что остаётся с одной сданной ночи после всех расходов и какая часть этого
// лишь возвращает вложенное. Та же модель, что у калькулятора (средний
// сценарий), только разложенная на одну проданную ночь.

type Snap = Pick<InvestmentSnapshot, 'villa' | 'region' | 'scenarios' | 'ownBooking'>

export type NightReceipt = {
  /** Цена на витрине, за которую считаем. */
  guest: number
  /** true — цена этого комплекса на Booking, false — средняя у соседей. */
  ownRate: boolean
  discount: number
  platform: number
  mgmt: number
  taxes: number
  upkeep: number
  /** На руки с одной сданной ночи = guest минус строки выше. */
  net: number
  /** Сколько из net возвращает вложенное (цена + оформление + мебель). */
  payback: number
  occupancyPct: number
  /** На руки в месяц и заработок сверх возврата вложенного. */
  month: number
  monthEarn: number
  /** Ниже этой цены ночь не возвращает даже вложенное. */
  breakeven: number | null
  entryPrice: number
  leaseYears: number
  buildYears: number
  /** Проценты модели — для подписей в чеке. */
  discountPct: number
  platformPct: number
  mgmtPct: number
}

function setup(snap: Snap) {
  const price = snap.villa.askingPrice
  const lease = snap.villa.leaseholdYearsLeft
  const build = Math.min(snap.villa.buildYearsLeft ?? 0, lease ?? 0)
  if (price == null || !(price > 0) || lease == null || !(lease - build > 0)) return null
  const occupancy = snap.ownBooking?.occupancy ?? snap.region.occupancyByScenario.median
  if (!(occupancy > 0)) return null
  const r = snap.region
  const econ = (adr: number) => computeEconomics({
    adr, occupancy,
    adrRealization: r.adrRealizationByScenario.median,
    phrOwnerShare: r.phrOwnerShareByScenario.median,
    area: snap.villa.area, bedrooms: snap.villa.bedrooms,
    askingPrice: price, leaseholdYearsLeft: lease,
    taxStatus: 'nonResident', region: r,
  })
  const soldNights = 365 * occupancy
  return { econ, soldNights, occupancy, price, lease, build, years: lease - build }
}

/** На руки в месяц, если сдавать по цене adr (витрина, за ночь). */
export function monthlyNetAt(snap: Snap, adr: number): number | null {
  const s = setup(snap)
  return s ? Math.round(s.econ(adr).noi / 12) : null
}

export function nightReceipt(snap: Snap): NightReceipt | null {
  const s = setup(snap)
  const own = snap.ownBooking?.adr ?? null
  const guest = own ?? snap.scenarios?.median.adrAsking ?? null
  if (!s || guest == null || !(guest > 0)) return null
  const e = s.econ(guest)
  if (e.entryPrice == null) return null
  const per = (x: number) => Math.round(x / s.soldNights)
  const discount = guest - e.adr
  const platform = per(e.platformFee)
  const mgmt = per(e.mgmtFee)
  const taxes = per(e.phrTax + e.tax)
  const upkeep = per(e.opex + e.ffeReserve + e.pbbTax)
  // Остаток считаем вычитанием округлённых строк — чек должен сходиться.
  const net = guest - discount - platform - mgmt - taxes - upkeep
  const capitalPerYear = e.entryPrice / s.years
  const payback = Math.round(capitalPerYear / s.soldNights)

  // Безубыток: цена, при которой ночь возвращает только вложенное.
  // noi растёт с ценой монотонно — бинарный поиск.
  let breakeven: number | null = null
  if (s.econ(10000).noi >= capitalPerYear) {
    let lo = 0, hi = 10000
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (s.econ(mid).noi >= capitalPerYear) hi = mid
      else lo = mid
    }
    breakeven = Math.round(hi)
  }

  return {
    guest, ownRate: own != null, discount, platform, mgmt, taxes, upkeep, net, payback,
    occupancyPct: Math.round(s.occupancy * 100),
    month: Math.round(e.noi / 12),
    monthEarn: Math.round((e.noi - capitalPerYear) / 12),
    breakeven,
    entryPrice: e.entryPrice, leaseYears: s.lease, buildYears: s.build,
    discountPct: Math.round((1 - snap.region.adrRealizationByScenario.median) * 100),
    platformPct: Math.round(snap.region.platformFeePct * 100),
    mgmtPct: Math.round(snap.region.mgmtFeePct * 100),
  }
}
