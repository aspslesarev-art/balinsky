// Sun, climate and air for every listing.
//
// Three independent sources, each doing what the others can't:
//
//   --solar    Google Solar API. maxSunshineHoursPerYear for the building under
//              the pin. Bali is covered (2025 imagery). Billed per request, so
//              this leg is capped.
//   --climate  NASA POWER daily archive, aggregated month by month: sunshine,
//              dry days, temperature. Public domain and free for commercial
//              use — unlike Open-Meteo's free tier, which is not. Sampled on a
//              ~5 km grid: climate does not change street to street, and it
//              keeps us polite to a free public API.
//   --air      Google Air Quality, 30 days of hourly history averaged. Also
//              grid-sampled — AQI is a regional quantity.
//
// Usage:
//   node scripts/build-listing-environment.mjs --climate            # free
//   node scripts/build-listing-environment.mjs --air --cap=6
//   node scripts/build-listing-environment.mjs --solar --cap=12
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.GOOGLE_PLACES_KEY
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const ARGS = process.argv.slice(2)
const DO_SOLAR = ARGS.includes('--solar')
const DO_CLIMATE = ARGS.includes('--climate')
const DO_AIR = ARGS.includes('--air')
const CAP = Number((ARGS.find(a => a.startsWith('--cap=')) || '--cap=15').split('=')[1])
if (!DO_SOLAR && !DO_CLIMATE && !DO_AIR) { console.error('pick at least one of --solar / --climate / --air'); process.exit(1) }

const SOLAR_COST = 0.010          // Building Insights, conservative
const AIR_COST = 0.010            // one history page
const GRID = 0.05                 // ~5 km sampling grid for regional data
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function loadListings() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('listing_geo')
      .select('kind,airtable_id,lat,lng')
      .order('airtable_id', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`listing_geo read failed: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

// One representative point per grid cell, plus the listings that belong to it.
function bucketByGrid(listings) {
  const cells = new Map()
  for (const l of listings) {
    const k = `${Math.round(l.lat / GRID)}:${Math.round(l.lng / GRID)}`
    let cell = cells.get(k)
    if (!cell) { cell = { lat: l.lat, lng: l.lng, listings: [] }; cells.set(k, cell) }
    cell.listings.push(l)
  }
  return [...cells.values()]
}

async function patch(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const slice = rows.slice(i, i + 200)
    const { error } = await sb.from('listing_geo_facts').upsert(slice, { onConflict: 'kind,airtable_id' })
    if (error) console.error(`\n  upsert ${i} failed: ${error.message}`)
  }
}

// ---- solar -----------------------------------------------------------------
async function solarFor(lat, lng) {
  const url = 'https://solar.googleapis.com/v1/buildingInsights:findClosest'
    + `?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${encodeURIComponent(KEY)}`
  const r = await fetch(url)
  // 404 = no building in Google's imagery near that pin. Normal, not an error.
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`solar ${r.status}: ${(await r.text()).slice(0, 120)}`)
  const j = await r.json()
  const sp = j.solarPotential
  if (!sp) return null
  const d = j.imageryDate
  return {
    hours: sp.maxSunshineHoursPerYear ?? null,
    solar: {
      roof_m2: sp.maxArrayAreaMeters2 != null ? Math.round(sp.maxArrayAreaMeters2) : null,
      panels: sp.maxArrayPanelsCount ?? null,
      imagery: d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : null,
    },
  }
}

// ---- climate (NASA POWER) --------------------------------------------------
// The output is deliberately in DAYS, not hours or kWh: "26 sunny days out of
// 31 in August" is something a buyer understands, "5.7 kWh/m²/day" is not.
//
// A day is classified by its clearness index — actual irradiance divided by
// what a cloudless sky would deliver at that spot on that date (ALLSKY /
// CLRSKY) — combined with rainfall:
//   sunny  clearness >= 0.70 and < 1 mm of rain   (bright, blue-sky day)
//   wet    >= 5 mm of rain                        (proper tropical downpour)
//   mixed  everything in between                  (sun and cloud)
// The 0.70 cut is not delicate: 0.75 moves Canggu's annual count from 144 to
// 141. Verified against Bali's seasons — February 0 sunny days, August 26.
async function climateFor(lat, lng) {
  const end = new Date(); end.setDate(end.getDate() - 30)
  const endStr = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`
  const startStr = `${end.getFullYear() - 5}0101`
  const url = 'https://power.larc.nasa.gov/api/temporal/daily/point'
    + '?parameters=ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN,PRECTOTCORR,T2M_MAX,RH2M&community=RE'
    + `&longitude=${lng}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`nasa ${r.status}`)
  const p = (await r.json())?.properties?.parameter
  if (!p?.PRECTOTCORR) return null

  const byMonth = {}
  const years = new Set()
  for (const day of Object.keys(p.PRECTOTCORR)) {
    const mm = day.slice(4, 6)
    const rain = p.PRECTOTCORR[day]
    const all = p.ALLSKY_SFC_SW_DWN?.[day]
    const clr = p.CLRSKY_SFC_SW_DWN?.[day]
    const tmax = p.T2M_MAX?.[day]
    const rh = p.RH2M?.[day]
    // POWER marks missing values as -999.
    if (rain == null || rain < -100) continue
    years.add(day.slice(0, 4))
    const m = (byMonth[mm] ??= { n: 0, sunny: 0, wet: 0, rain: 0, tmax: 0, tmaxN: 0, rh: 0, rhN: 0 })
    m.n++
    const clearness = all > -100 && clr > 0 ? all / clr : null
    if (clearness != null && clearness >= 0.70 && rain < 1) m.sunny++
    else if (rain >= 5) m.wet++
    m.rain += rain
    if (tmax != null && tmax > -100) { m.tmax += tmax; m.tmaxN++ }
    if (rh != null && rh > -100) { m.rh += rh; m.rhN++ }
  }

  const yearCount = Math.max(1, years.size)
  const out = {}
  let sunnyYear = 0, wetYear = 0, daysYear = 0
  for (const [mm, m] of Object.entries(byMonth)) {
    if (!m.n) continue
    const sunny = Math.round(m.sunny / yearCount)
    const wet = Math.round(m.wet / yearCount)
    const days = Math.round(m.n / yearCount)
    sunnyYear += m.sunny / yearCount
    wetYear += m.wet / yearCount
    daysYear += m.n / yearCount
    out[mm] = {
      days,
      sunny,
      wet,
      mixed: Math.max(0, days - sunny - wet),
      rain_mm: +(m.rain / m.n).toFixed(1),
      t_max: m.tmaxN ? +(m.tmax / m.tmaxN).toFixed(1) : null,
      rh: m.rhN ? Math.round(m.rh / m.rhN) : null,
    }
  }
  if (!Object.keys(out).length) return null
  out.year = {
    days: Math.round(daysYear),
    sunny: Math.round(sunnyYear),
    wet: Math.round(wetYear),
    mixed: Math.max(0, Math.round(daysYear - sunnyYear - wetYear)),
    years: yearCount,
  }
  return out
}

// ---- air quality -----------------------------------------------------------
async function airFor(lat, lng) {
  const stats = { u: [], i: [], dom: {} }
  let pageToken = null
  let pages = 0
  do {
    const body = { location: { latitude: lat, longitude: lng }, hours: 720, pageSize: 720, extraComputations: ['LOCAL_AQI'] }
    if (pageToken) body.pageToken = pageToken
    const r = await fetch(`https://airquality.googleapis.com/v1/history:lookup?key=${encodeURIComponent(KEY)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`air ${r.status}: ${(await r.text()).slice(0, 120)}`)
    const j = await r.json()
    for (const h of j.hoursInfo ?? []) {
      const u = h.indexes?.find(x => x.code === 'uaqi')
      const local = h.indexes?.find(x => x.code !== 'uaqi')
      if (u?.aqi != null) stats.u.push(u.aqi)
      if (local?.aqi != null) stats.i.push(local.aqi)
      const dom = u?.dominantPollutant ?? local?.dominantPollutant
      if (dom) stats.dom[dom] = (stats.dom[dom] ?? 0) + 1
    }
    pageToken = j.nextPageToken ?? null
    pages++
    await sleep(150)
  } while (pageToken && pages < 12)

  if (!stats.u.length && !stats.i.length) return { air: null, pages }
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null)
  const dominant = Object.entries(stats.dom).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return {
    air: {
      uaqi_avg: avg(stats.u),
      uaqi_min: stats.u.length ? Math.min(...stats.u) : null,
      uaqi_max: stats.u.length ? Math.max(...stats.u) : null,
      ispu_avg: avg(stats.i),
      dominant,
      hours: Math.max(stats.u.length, stats.i.length),
    },
    pages,
  }
}

// ---- main ------------------------------------------------------------------
const listings = await loadListings()
const cells = bucketByGrid(listings)
console.log(`listings=${listings.length}  grid cells=${cells.length}`)

if (DO_CLIMATE) {
  console.log('climate (NASA POWER, free) …')
  let ok = 0, fail = 0
  const rows = []
  for (const [idx, cell] of cells.entries()) {
    try {
      const climate = await climateFor(cell.lat, cell.lng)
      if (climate) {
        ok++
        for (const l of cell.listings) rows.push({ kind: l.kind, airtable_id: l.airtable_id, lat: l.lat, lng: l.lng, climate })
      } else fail++
    } catch (e) {
      fail++
      if (fail <= 3) console.error(`\n  cell ${idx} failed: ${e.message}`)
    }
    process.stdout.write(`\r  cells ${idx + 1}/${cells.length}  ok=${ok} fail=${fail}`)
    await sleep(400)   // be gentle with a free public API
  }
  await patch(rows)
  console.log(`\n  climate written for ${rows.length} listings`)
}

if (DO_AIR) {
  const estimate = cells.length * AIR_COST
  console.log(`air quality: ${cells.length} cells ≈ $${estimate.toFixed(2)} (cap $${CAP})`)
  if (estimate > CAP) { console.error('!! over cap'); process.exit(1) }
  let spent = 0, ok = 0
  const rows = []
  for (const [idx, cell] of cells.entries()) {
    try {
      const { air, pages } = await airFor(cell.lat, cell.lng)
      spent += pages * AIR_COST
      if (air) {
        ok++
        for (const l of cell.listings) rows.push({ kind: l.kind, airtable_id: l.airtable_id, lat: l.lat, lng: l.lng, air })
      }
    } catch (e) {
      if (idx < 3) console.error(`\n  cell ${idx} failed: ${e.message}`)
    }
    process.stdout.write(`\r  cells ${idx + 1}/${cells.length}  ok=${ok}  ≈$${spent.toFixed(2)}`)
    if (spent >= CAP) { console.log('\n  !! cap reached'); break }
  }
  await patch(rows)
  console.log(`\n  air written for ${rows.length} listings, est. spend $${spent.toFixed(2)}`)
}

if (DO_SOLAR) {
  const estimate = listings.length * SOLAR_COST
  console.log(`solar: ${listings.length} listings ≈ $${estimate.toFixed(2)} (cap $${CAP})`)
  if (estimate > CAP) { console.error('!! over cap — raise --cap'); process.exit(1) }
  let spent = 0, ok = 0, none = 0
  const rows = []
  for (const [idx, l] of listings.entries()) {
    try {
      const res = await solarFor(l.lat, l.lng)
      spent += SOLAR_COST
      if (res) {
        ok++
        rows.push({ kind: l.kind, airtable_id: l.airtable_id, lat: l.lat, lng: l.lng, sunshine_hours_year: res.hours, solar: res.solar })
      } else none++
    } catch (e) {
      if (idx < 3) console.error(`\n  ${l.airtable_id}: ${e.message}`)
    }
    if ((idx + 1) % 25 === 0) process.stdout.write(`\r  ${idx + 1}/${listings.length}  ok=${ok} no-building=${none}  ≈$${spent.toFixed(2)}`)
    if (spent >= CAP) { console.log('\n  !! cap reached'); break }
  }
  await patch(rows)
  console.log(`\n  solar written for ${rows.length} listings (no building for ${none}), est. spend $${spent.toFixed(2)}`)
}
