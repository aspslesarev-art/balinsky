// Bali market index — the numbers behind /en/bali-property-prices and
// /en/bali-rental-prices (and their RU twins).
//
// Asking prices come from the published catalogue (raw_villas, raw_apartments);
// nightly rates from the short-term rental database (booking_data_*, sourced
// from estatemarket.io). A rental is placed in a district by the nearest
// catalogue listing within 1.5 km — the same method as lib/district-market.json
// and the rental-yield article. Medians throughout; p25/p75 for spread.
//
// Run monthly:  node scripts/build-market-index.mjs   → lib/market-index.json

import fs from 'node:fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n')
  .map(l => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]))
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_KEY

async function pull(table, select, filter = '') {
  const out = []
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${off}-${off + 999}`, 'Range-Unit': 'items' },
    })
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`)
    const rows = await r.json()
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

const first = x => (Array.isArray(x) ? x[0] : x)
const num = x => { const v = Number(String(first(x) ?? '').replace(',', '.')); return Number.isFinite(v) && v > 0 ? v : null }
const coord = x => { const v = Number(String(first(x) ?? '').replace(',', '.')); return Number.isFinite(v) && v !== 0 ? v : null }
const str = x => { const v = first(x); return typeof v === 'string' && v.trim() ? v.trim() : null }
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo) }
const med = a => q(a, 0.5)
const round = (v, step = 1) => (v == null ? null : Math.round(v / step) * step)

const villasRaw = await pull('raw_villas', 'data')
const aptsRaw = await pull('raw_apartments', 'data')
const pub = rows => rows.map(r => r.data).filter(d => first(d['Опубликовать']) === true || first(d['Опубликовать']) === 'true')

const villas = pub(villasRaw).map(d => ({
  district: str(d['Location 2']) ?? str(d['Location']),
  price: num(d['price']) ?? num(d['Цена']),
  area: num(d['Площадь']),
  beds: num(d['Комнаты']),
  lease: num(d['Leasehold']) ?? num(d['Leashold']),
  building: str(d['Статус']) === 'Строится',
  permit: ['PBG', 'SLF'].includes(str(d['Разрешение']) ?? ''),
  lat: coord(d['Geo']), lng: coord(d['Geo 2']),
})).filter(v => v.price && v.price >= 30000)

const apts = pub(aptsRaw).map(d => ({
  district: str(d['Location filter']) ?? str(d['Location 2 EN']),
  price: num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена']),
  area: num(d['Площадь']),
  beds: num(d['Комнаты']),
  lat: coord(d['Geo']), lng: coord(d['Geo 2']),
})).filter(a => a.price && a.price >= 20000)

// Rentals → district by the nearest catalogue listing within 1.5 km.
const locs = await pull('booking_data_locations', 'id,price,lat,lng')
const cards = new Map((await pull('booking_data_cards', 'id,unit_kind,bedrooms,min_price')).map(c => [c.id, c]))
const anchors = [...villas, ...apts].filter(x => x.lat && x.lng && x.district && Math.abs(x.lat) < 90)
const km = (a, b) => { const dy = (a.lat - b.lat) * 111, dx = (a.lng - b.lng) * 111 * Math.cos(a.lat * Math.PI / 180); return Math.hypot(dx, dy) }
const rentals = []
for (const l of locs) {
  const c = cards.get(l.id)
  if (!c || !l.lat || !l.lng) continue
  const rate = num(l.price) ?? num(c.min_price)
  if (!rate || rate < 15 || rate > 3000) continue
  let best = null, bd = 1.5
  for (const a of anchors) { const d = km(l, a); if (d < bd) { bd = d; best = a } }
  if (!best) continue
  rentals.push({ district: best.district, kind: c.unit_kind, beds: c.bedrooms, rate })
}

const by = (rows, key) => rows.reduce((m, r) => ((m[key(r)] ??= []).push(r), m), {})
const perM2 = rows => rows.filter(r => r.area && r.area >= 25).map(r => r.price / r.area)

function saleStats(rows) {
  const prices = rows.map(r => r.price), m2 = perM2(rows)
  return {
    n: rows.length,
    median: round(med(prices), 500), p25: round(q(prices, 0.25), 500), p75: round(q(prices, 0.75), 500),
    perM2: round(med(m2), 10), perM2N: m2.length,
  }
}

const villaDistricts = {}
for (const [d, rows] of Object.entries(by(villas.filter(v => v.district), v => v.district))) {
  if (rows.length < 5) continue
  const lease = rows.map(r => r.lease).filter(x => x && x < 70)
  villaDistricts[d] = {
    ...saleStats(rows),
    median2br: round(med(rows.filter(r => r.beds === 2).map(r => r.price)), 500), n2br: rows.filter(r => r.beds === 2).length,
    leaseYears: med(lease), leaseN: lease.length,
    offPlanShare: Math.round(100 * rows.filter(r => r.building).length / rows.length),
    permitShare: Math.round(100 * rows.filter(r => r.permit).length / rows.length),
  }
}
const aptDistricts = {}
for (const [d, rows] of Object.entries(by(apts.filter(a => a.district), a => a.district))) {
  if (rows.length < 5) continue
  aptDistricts[d] = saleStats(rows)
}
const bedBucket = b => (b == null ? null : b >= 4 ? '4+' : String(b))
const villaByBeds = {}
for (const [b, rows] of Object.entries(by(villas.filter(v => bedBucket(v.beds)), v => bedBucket(v.beds)))) villaByBeds[b] = saleStats(rows)

const rentStats = rows => ({ n: rows.length, median: round(med(rows.map(r => r.rate)), 1), p25: round(q(rows.map(r => r.rate), 0.25), 1), p75: round(q(rows.map(r => r.rate), 0.75), 1) })
const rentDistricts = {}
for (const [d, rows] of Object.entries(by(rentals, r => r.district))) {
  const v = rows.filter(r => r.kind === 'villa')
  const out = { villas: v.length, apartments: rows.filter(r => r.kind === 'apartment').length }
  for (const b of [1, 2, 3, 4]) { const s = v.filter(r => (b === 4 ? r.beds >= 4 : r.beds === b)); if (s.length >= 5) out[`villa${b}br`] = rentStats(s) }
  const ap = rows.filter(r => r.kind === 'apartment'); if (ap.length >= 5) out.apartment = rentStats(ap)
  if (v.length + ap.length >= 10) rentDistricts[d] = out
}
const islandVillaRent = {}
for (const b of [1, 2, 3, 4]) islandVillaRent[`${b}br`] = rentStats(rentals.filter(r => r.kind === 'villa' && (b === 4 ? r.beds >= 4 : r.beds === b)))

// Long-term (monthly) asking rents — the rental catalogue manifest, last 180
// days, same window the villa pages compare against (lib/rental.ts).
const rentalManifest = await (await fetch(`${URL_}/storage/v1/object/public/rental/_rental.json`)).json()
const since = Date.now() - 180 * 864e5
const DISTRICT_FIX = { Perenenan: 'Pererenan' }
const monthly = rentalManifest.items
  .filter(x => x.createdTime && Date.parse(x.createdTime) >= since && x.priceMonthUsd >= 200 && x.priceMonthUsd <= 30000)
  .map(x => ({ district: DISTRICT_FIX[x.location] ?? x.location, villa: x.type === 'Вилла', beds: x.bedrooms, rate: x.priceMonthUsd, at: x.createdTime }))
const monthlyStats = rows => ({ n: rows.length, median: round(med(rows.map(r => r.rate)), 50), p25: round(q(rows.map(r => r.rate), 0.25), 50), p75: round(q(rows.map(r => r.rate), 0.75), 50) })
const monthlyIsland = { apartment: monthlyStats(monthly.filter(r => !r.villa)) }
for (const b of [1, 2, 3, 4]) monthlyIsland[`villa${b}br`] = monthlyStats(monthly.filter(r => r.villa && (b === 4 ? r.beds >= 4 : r.beds === b)))
const monthlyDistricts = {}
for (const [d, rows] of Object.entries(by(monthly.filter(r => r.district), r => r.district))) {
  if (rows.length < 10) continue
  const o = { n: rows.length, all: monthlyStats(rows) }
  for (const b of [1, 2, 3]) { const s = rows.filter(r => r.villa && r.beds === b); if (s.length >= 5) o[`villa${b}br`] = monthlyStats(s) }
  monthlyDistricts[d] = o
}
const monthlyDates = monthly.map(r => r.at).sort()

const out = {
  asOf: new Date().toISOString().slice(0, 7),
  generatedAt: new Date().toISOString(),
  source: 'Balinsky catalogue (asking prices of published listings) and Balinsky short-term rental database (nightly rates, sourced from estatemarket.io). Rentals placed in a district by the nearest catalogue listing within 1.5 km.',
  totals: { villas: villas.length, apartments: apts.length, rentals: rentals.length, villaRentals: rentals.filter(r => r.kind === 'villa').length },
  island: {
    villas: {
      ...saleStats(villas),
      offPlanShare: Math.round(100 * villas.filter(r => r.building).length / villas.length),
      permitShare: Math.round(100 * villas.filter(r => r.permit).length / villas.length),
      leaseYears: med(villas.map(r => r.lease).filter(x => x && x < 70)),
    },
    apartments: saleStats(apts), villaByBeds, villaRent: islandVillaRent, apartmentRent: rentStats(rentals.filter(r => r.kind === 'apartment')) },
  villaDistricts, aptDistricts, rentDistricts,
  monthly: { n: monthly.length, from: monthlyDates[0]?.slice(0, 10) ?? null, to: monthlyDates.at(-1)?.slice(0, 10) ?? null, island: monthlyIsland, districts: monthlyDistricts },
}
fs.writeFileSync('lib/market-index.json', JSON.stringify(out, null, 1) + '\n')
// Monthly snapshot: the history month-over-month comparisons will be built on.
fs.mkdirSync('data/market-history', { recursive: true })
fs.writeFileSync(`data/market-history/${out.asOf}.json`, JSON.stringify(out) + '\n')
console.log(JSON.stringify(out.totals), Object.keys(villaDistricts).length, 'villa districts,', Object.keys(aptDistricts).length, 'apt,', Object.keys(rentDistricts).length, 'rent')
