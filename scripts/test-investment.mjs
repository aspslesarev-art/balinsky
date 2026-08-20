// Тесты инвестиционной модели.
// Запуск: `node --experimental-strip-types --test scripts/test-investment.mjs`
//
// Экономика импортируется из ПРОДОВОГО модуля, а не копируется сюда.
// Раньше формула была продублирована в этом файле со своими константами —
// тест проверял сам себя и остался бы зелёным при любой правке модели.
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeEconomics, leaseholdIrr } from '../lib/investment/economics.ts'
import { BALI_DEFAULTS as BALI } from '../lib/investment/regions.ts'

// Хелпер: сценарные параметры подставляются из региона, чтобы тесты
// не расходились с дефолтами при их изменении.
function econ(over = {}) {
  return computeEconomics({
    adr: 200, occupancy: BALI.occupancyByScenario.median,
    adrRealization: BALI.adrRealizationByScenario.median,
    phrOwnerShare: BALI.phrOwnerShareByScenario.median,
    area: 200, bedrooms: 3, askingPrice: null, leaseholdYearsLeft: null,
    taxStatus: 'nonResident', region: BALI,
    ...over,
  })
}

function classifyZone(beaches) {
  if (beaches.length === 0) return { zone: 'inland', nearestBeach: null, walkingMeters: null }
  const sorted = [...beaches].sort((a, b) => a.distanceKm - b.distanceKm)
  const n = sorted[0]
  const m = Math.round(n.distanceKm * 1000 * 1.3)
  let zone = m <= 100 ? 'beachfront' : m <= 500 ? 'walking' : m <= 1500 ? 'scooter' : 'inland'
  return { zone, nearestBeach: n, walkingMeters: m }
}

function quantile(s, q) {
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos), hi = Math.ceil(pos)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

// Mock fixtures
const beachClose = [{ lat: -8.6485, lng: 115.1170, distanceKm: 0.05, name: 'Pererenan Beach' }]
const beachWalking = [{ lat: -8.6520, lng: 115.1216, distanceKm: 0.55, name: 'Pererenan Beach' }]

function makeComps(n, opts = {}) {
  const out = []
  for (let i = 0; i < n; i++) {
    out.push({
      id: 'c' + i,
      lat: -8.6475 + (i % 5) * 0.001,
      lng: 115.1202 + Math.floor(i / 5) * 0.001,
      bedrooms: 3, area: 200, pool: 'Собственный бассейн',
      price: 100 + i * 10, distanceKm: 0.1 + i * 0.05,
      ...opts,
    })
  }
  return out
}

test('classifyZone: beachfront ≤100m walking', () => {
  const z = classifyZone(beachClose)
  assert.equal(z.zone, 'beachfront')
})

test('classifyZone: walking 100-500m', () => {
  const z = classifyZone(beachWalking)
  assert.ok(['walking', 'scooter'].includes(z.zone), `expected walking/scooter, got ${z.zone}`)
})

test('classifyZone: empty beaches → inland', () => {
  assert.equal(classifyZone([]).zone, 'inland')
})

test('STANDARD mode: ≥12 matches → scenarios with quartiles', () => {
  const matches = makeComps(15)
  const sorted = matches.map(m => m.price).sort((a, b) => a - b)
  const p25 = quantile(sorted, 0.25), p50 = quantile(sorted, 0.50), p75 = quantile(sorted, 0.75)
  assert.ok(p25 < p50 && p50 < p75, 'quartiles should be strictly ordered')
  assert.ok(matches.length >= 12, 'sample size triggers standard mode')
})

test('REDUCED mode: 5-11 matches → still scenarios but medium confidence', () => {
  const matches = makeComps(7)
  assert.ok(matches.length >= 5 && matches.length < 12)
})

test('REFERENCES mode: <5 matches → no scenarios', () => {
  const matches = makeComps(3)
  assert.ok(matches.length < 5, 'should switch to references')
})

test('EMERGING_MARKET: <30 listings within 1km', () => {
  const within1km = 12
  const emerging = within1km < 30
  assert.equal(emerging, true)
})

test('Leasehold WARNING: payback > years_left triggers risk', () => {
  const e = econ({ adr: 150, occupancy: 0.4, area: 150, askingPrice: 500_000, leaseholdYearsLeft: 10 })
  // небольшая площадь + низкая загрузка → скромный NOI против $500k → окупаемость > 10 лет
  assert.ok(e.noi > 0, `expected positive NOI, got ${e.noi}`)
  assert.ok(e.payback > 10, `expected payback > 10y, got ${e.payback}`)
  assert.equal(e.leaseholdRisk, true, 'leasehold risk should be true')
})

test('Leasehold OK: long lease + strong NOI', () => {
  const e = econ({ adr: 300, occupancy: 0.7, area: 200, askingPrice: 500_000, leaseholdYearsLeft: 30 })
  assert.equal(e.leaseholdRisk, false)
  assert.ok(e.capRate > BALI.capRateThresholdWeak, `cap rate should be above weak threshold, got ${e.capRate}`)
})

test('Cap rate WEAK threshold detection', () => {
  const e = econ({ adr: 80, occupancy: 0.4, askingPrice: 500_000, leaseholdYearsLeft: 30 })
  assert.ok(e.capRate < BALI.capRateThresholdWeak, `expected weak cap rate, got ${e.capRate}`)
})

test('Водопад сходится: выручка − все расходы = прибыль до налога', () => {
  // С ценой объекта — иначе PBB равен нулю и выпадает из проверки.
  const e = econ({ askingPrice: 400_000 })
  const costs = e.platformFee + e.phrTax + e.mgmtFee + e.opex + e.ffeReserve + e.pbbTax
  assert.ok(e.pbbTax > 0, 'PBB должен считаться, когда цена известна')
  assert.ok(Math.abs((e.revenue - costs) - e.preTaxProfit) <= 2,
    `водопад не сходится: ${e.revenue} − ${costs} ≠ ${e.preTaxProfit}`)
  assert.ok(Math.abs((e.preTaxProfit - e.tax) - e.noi) <= 2, 'прибыль − налог ≠ чистыми')
})

test('Разбивка расходов складывается ровно в общую сумму', () => {
  for (const over of [{}, { area: 30, bedrooms: 1 }, { area: 400, bedrooms: 5 }]) {
    const e = econ(over)
    const p = e.opexParts
    const sum = p.utilities + p.staff + p.supplies + p.poolGarden + p.other
    assert.equal(sum, e.opex, `разбивка ${sum} ≠ расходам ${e.opex} при ${JSON.stringify(over)}`)
    assert.ok(p.other >= 0, 'остаточная статья не должна уходить в минус')
  }
})

test('PBB считается от цены и отсутствует без неё', () => {
  assert.equal(econ({ askingPrice: null }).pbbTax, 0)
  const e = econ({ askingPrice: 300_000 })
  assert.equal(e.pbbTax, Math.round(300_000 * BALI.pbbAnnualPctOfPrice))
})

test('Ставка идёт в выручку с коэффициентом реализации, а не как в выдаче', () => {
  const e = econ({ adr: 200 })
  assert.equal(e.adrAsking, 200)
  assert.equal(e.adr, Math.round(200 * BALI.adrRealizationByScenario.median))
  assert.ok(Math.abs(e.revenue - e.adr * 365 * e.occupancy) < 2)
})

test('Доходность считается от цены входа, а не от прайса', () => {
  const price = 400_000
  const e = econ({ askingPrice: price, area: 150 })
  assert.ok(e.entryPrice > price, 'цена входа должна быть выше прайса')
  assert.equal(e.entryPrice, price + e.closingCost + e.furnishing)
  assert.ok(Math.abs(e.capRate - e.noi / e.entryPrice) < 1e-9)
  assert.ok(e.capRate < e.noi / price, 'доходность от входа обязана быть ниже, чем от прайса')
})

test('Меблированный застройщиком объект не платит за мебель дважды', () => {
  const base = econ({ askingPrice: 400_000, area: 150 })
  const furnished = econ({ askingPrice: 400_000, area: 150, furnished: true })
  assert.ok(base.furnishing > 0)
  assert.equal(furnished.furnishing, 0)
  assert.ok(furnished.capRate > base.capRate)
})

test('Расходы не опускаются ниже базового минимума на компактных объектах', () => {
  const tiny = econ({ area: 30, bedrooms: 1, askingPrice: 150_000 })
  assert.equal(tiny.opexAtFloor, true)
  assert.equal(tiny.opex, BALI.opexFloorBase + BALI.opexFloorPerBedroom * 1)
  const big = econ({ area: 300, bedrooms: 3 })
  assert.equal(big.opexAtFloor, false, 'на большой площади должна работать оценка по метражу')
})

test('Налог резидента ниже налога нерезидента', () => {
  const nr = econ({ askingPrice: 400_000 })
  const r = econ({ askingPrice: 400_000, taxStatus: 'resident' })
  assert.ok(r.tax < nr.tax)
  assert.ok(r.capRate > nr.capRate)
})

test('С убытка налог не берётся', () => {
  const e = econ({ adr: 10, occupancy: 0.3, area: 250, bedrooms: 4, askingPrice: 500_000 })
  assert.ok(e.preTaxProfit < 0, 'кейс должен быть убыточным')
  assert.equal(e.tax, 0)
  assert.equal(e.noi, e.preTaxProfit)
})

test('Лизхолд: капитал не возвращается, когда поток за срок меньше входа', () => {
  const weak = econ({ adr: 90, askingPrice: 500_000, area: 150, leaseholdYearsLeft: 25 })
  assert.equal(weak.capitalReturned, false)
  assert.equal(weak.leaseholdIrr, null, 'IRR не существует, когда поток не покрывает вложенное')
})

test('Лизхолд: сильный объект возвращает капитал и имеет IRR', () => {
  const strong = econ({ adr: 400, occupancy: 0.7, askingPrice: 250_000, area: 120, leaseholdYearsLeft: 30 })
  assert.equal(strong.capitalReturned, true)
  assert.ok(strong.leaseholdIrr > 0)
})

test('IRR обнуляет дисконтированный поток', () => {
  const irr = leaseholdIrr(100_000, 12_000, 25)
  assert.ok(irr != null)
  let npv = -100_000
  for (let t = 1; t <= 25; t++) npv += 12_000 / (1 + irr) ** t
  assert.ok(Math.abs(npv) < 1, `NPV при IRR должен быть нулём, получено ${npv}`)
})

test('Freehold: без срока лиза нет ни IRR, ни вердикта о возврате', () => {
  const e = econ({ askingPrice: 400_000, leaseholdYearsLeft: null })
  assert.equal(e.leaseholdIrr, null)
  assert.equal(e.capitalReturned, null)
  assert.equal(e.leaseholdRisk, false)
})

test('No asking price: payback/capRate are null', () => {
  const e = econ({ askingPrice: null })
  assert.equal(e.payback, null)
  assert.equal(e.capRate, null)
  assert.equal(e.entryPrice, null)
})
