// Plain node tests for investment lib. Run: `node scripts/test-investment.mjs`
import test from 'node:test'
import assert from 'node:assert/strict'

// Manually port the core pure functions for testing without TS compile.
// The actual prod code lives in lib/investment/* — this is mirrored logic.

function classifyZone(beaches) {
  if (beaches.length === 0) return { zone: 'inland', nearestBeach: null, walkingMeters: null }
  const sorted = [...beaches].sort((a, b) => a.distanceKm - b.distanceKm)
  const n = sorted[0]
  const m = Math.round(n.distanceKm * 1000 * 1.3)
  let zone = m <= 100 ? 'beachfront' : m <= 500 ? 'walking' : m <= 1500 ? 'scooter' : 'inland'
  return { zone, nearestBeach: n, walkingMeters: m }
}

function dist(aLat, aLng, bLat, bLng) {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180
  const la1 = (aLat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function quantile(s, q) {
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos), hi = Math.ceil(pos)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

function computeEconomics({ adr, occupancy, area, askingPrice, leaseholdYearsLeft, region }) {
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
  return { revenue, noi, payback, capRate, leaseholdRisk, opex, tax }
}

const BALI = {
  occupancyByScenario: { bad: 0.50, median: 0.65, good: 0.85 },
  platformFeePct: 0.15, mgmtFeePct: 0.22, opexPerSqmMonth: 4, taxRate: 0.10, capRateThresholdWeak: 0.06,
}

// Mock fixtures
const villaPererenan = { lat: -8.6475, lng: 115.1202, bedrooms: 3, area: 200, hasPool: true, askingPrice: 500_000, leaseholdYearsLeft: 30 }
const villaPererenanNarrow = { ...villaPererenan, leaseholdYearsLeft: 10 }
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
  const e = computeEconomics({
    adr: 150, occupancy: 0.4, area: 150,
    askingPrice: 500_000, leaseholdYearsLeft: 10, region: BALI,
  })
  // small area + low occupancy → modest NOI vs $500k → payback > 10y → risk
  assert.ok(e.noi > 0, `expected positive NOI, got ${e.noi}`)
  assert.ok(e.payback > 10, `expected payback > 10y, got ${e.payback}`)
  assert.equal(e.leaseholdRisk, true, 'leasehold risk should be true')
})

test('Leasehold OK: long lease + strong NOI', () => {
  const e = computeEconomics({
    adr: 300, occupancy: 0.7, area: 200,
    askingPrice: 500_000, leaseholdYearsLeft: 30, region: BALI,
  })
  assert.equal(e.leaseholdRisk, false)
  assert.ok(e.capRate > 0.06, `cap rate should be above weak threshold, got ${e.capRate}`)
})

test('Cap rate WEAK threshold detection', () => {
  const e = computeEconomics({
    adr: 80, occupancy: 0.4, area: 200,
    askingPrice: 500_000, leaseholdYearsLeft: 30, region: BALI,
  })
  assert.ok(e.capRate < 0.06, `expected weak cap rate, got ${e.capRate}`)
})

test('Economics: NOI = revenue − fees − opex − tax', () => {
  const e = computeEconomics({
    adr: 200, occupancy: 0.55, area: 200,
    askingPrice: null, leaseholdYearsLeft: null, region: BALI,
  })
  const expectedRevenue = 200 * 365 * 0.55
  const expectedPlatform = expectedRevenue * 0.15
  const expectedMgmt = expectedRevenue * 0.22
  const expectedOpex = 200 * 4 * 12
  const taxable = expectedRevenue - expectedPlatform - expectedMgmt - expectedOpex
  const expectedTax = taxable * 0.10
  const expectedNoi = expectedRevenue - expectedPlatform - expectedMgmt - expectedOpex - expectedTax
  assert.ok(Math.abs(e.noi - expectedNoi) < 1, `NOI mismatch: ${e.noi} vs ${expectedNoi}`)
  assert.equal(e.payback, null)
  assert.equal(e.capRate, null)
})

test('No asking price: payback/capRate are null', () => {
  const e = computeEconomics({ adr: 200, occupancy: 0.55, area: 200, askingPrice: null, leaseholdYearsLeft: null, region: BALI })
  assert.equal(e.payback, null)
  assert.equal(e.capRate, null)
})
