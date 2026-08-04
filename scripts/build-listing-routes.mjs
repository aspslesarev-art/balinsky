// Real drive times from every listing to the anchors buyers ask about, plus
// altitude. Straight-line distance is worthless on Bali: Canggu sits 19 km from
// the airport and 50 minutes away in traffic.
//
// Routes API bills per element (origins × destinations), so the run is capped
// and reports its estimate before spending anything. Elevation is effectively
// free (512 points per request) and rides along in the same script.
//
// Usage:
//   node scripts/build-listing-routes.mjs --dry           # count elements, spend nothing
//   node scripts/build-listing-routes.mjs --cap=60        # full run, hard stop at $60
//   node scripts/build-listing-routes.mjs --no-traffic    # cheaper Essentials tier
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.GOOGLE_PLACES_KEY
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_KEY
if (!KEY || !SB_URL || !SB_KEY) { console.error('Missing GOOGLE_PLACES_KEY / Supabase env in .env.local'); process.exit(1) }

const ARGS = process.argv.slice(2)
const DRY = ARGS.includes('--dry')
const TRAFFIC = !ARGS.includes('--no-traffic')
// A whole 100-origin batch can die on one bad response; re-running everything
// would re-buy 5k elements, so allow topping up just the gaps.
const ONLY_MISSING = ARGS.includes('--only-missing')
const CAP = Number((ARGS.find(a => a.startsWith('--cap=')) || '--cap=60').split('=')[1])

// Traffic-aware routing bills at the Advanced tier, free-flow at Essentials.
const COST_PER_ELEMENT = TRAFFIC ? 0.010 : 0.005
// computeRouteMatrix allows 625 elements per request with TRAFFIC_AWARE.
const ORIGINS_PER_REQ = 100

// The places a buyer actually measures a location against.
const DESTS = [
  ['airport', -8.74670, 115.16680],   // Ngurah Rai International
  ['canggu',  -8.66000, 115.13800],   // Berawa / Canggu core
  ['ubud',    -8.50690, 115.26250],   // Ubud centre
  ['uluwatu', -8.82914, 115.08490],   // Uluwatu temple / south Bukit
  ['sanur',   -8.68800, 115.26200],   // Sanur beachfront
]

const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

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
  if (!ONLY_MISSING) return rows

  const done = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('listing_geo_facts')
      .select('kind,airtable_id,routes')
      .not('routes', 'is', null)
      .order('airtable_id', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`listing_geo_facts read failed: ${error.message}`)
    for (const r of data ?? []) done.add(`${r.kind}|${r.airtable_id}`)
    if (!data || data.length < 1000) break
  }
  return rows.filter(r => !done.has(`${r.kind}|${r.airtable_id}`))
}

async function routeMatrix(origins) {
  const body = {
    origins: origins.map(o => ({ waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } } })),
    destinations: DESTS.map(([, lat, lng]) => ({ waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } })),
    travelMode: 'DRIVE',
    routingPreference: TRAFFIC ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
  }
  const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`routes ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}

// Elevation takes up to 512 points per request and costs a rounding error.
async function elevations(points) {
  const locs = points.map(p => `${p.lat},${p.lng}`).join('|')
  const r = await fetch(`https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locs)}&key=${encodeURIComponent(KEY)}`)
  if (!r.ok) throw new Error(`elevation ${r.status}`)
  const j = await r.json()
  if (j.status !== 'OK') throw new Error(`elevation ${j.status}: ${j.error_message ?? ''}`)
  return j.results.map(x => x.elevation)
}

// ---- main ----
const listings = await loadListings()
const elements = listings.length * DESTS.length
const estimate = elements * COST_PER_ELEMENT

console.log(`listings=${listings.length}  destinations=${DESTS.length}  elements=${elements}`)
console.log(`  mode=${TRAFFIC ? 'traffic-aware' : 'free-flow'}  est. cost $${estimate.toFixed(2)}  (cap $${CAP})`)
if (estimate > CAP) {
  console.error('!! estimate exceeds cap — raise --cap or drop destinations')
  process.exit(1)
}
if (DRY) process.exit(0)

const now = new Date().toISOString()
const byId = new Map()
for (const l of listings) byId.set(`${l.kind}|${l.airtable_id}`, { ...l, routes: {}, elevation_m: null })

let spent = 0
for (let i = 0; i < listings.length; i += ORIGINS_PER_REQ) {
  const batch = listings.slice(i, i + ORIGINS_PER_REQ)
  let res
  try {
    res = await routeMatrix(batch)
  } catch (e) {
    console.error(`\n  batch ${i} failed: ${e.message}`)
    continue
  }
  spent += batch.length * DESTS.length * COST_PER_ELEMENT
  for (const cell of res) {
    // A cell with no route (bad geocode, island-to-island) comes back without a
    // duration — leave it out rather than store a fake zero.
    if (cell.duration == null) continue
    const origin = batch[cell.originIndex ?? 0]
    const dest = DESTS[cell.destinationIndex ?? 0]
    if (!origin || !dest) continue
    const rec = byId.get(`${origin.kind}|${origin.airtable_id}`)
    if (!rec) continue
    rec.routes[dest[0]] = { s: Number(String(cell.duration).replace('s', '')), m: cell.distanceMeters ?? null }
  }
  process.stdout.write(`\r  routed ${Math.min(i + ORIGINS_PER_REQ, listings.length)}/${listings.length}  ≈$${spent.toFixed(2)}`)
}

console.log('\nfetching elevations …')
for (let i = 0; i < listings.length; i += 400) {
  const batch = listings.slice(i, i + 400)
  try {
    const heights = await elevations(batch)
    batch.forEach((l, idx) => {
      const rec = byId.get(`${l.kind}|${l.airtable_id}`)
      if (rec && heights[idx] != null) rec.elevation_m = Math.round(heights[idx] * 10) / 10
    })
  } catch (e) {
    console.error(`  elevation batch ${i} failed: ${e.message}`)
  }
}

const rows = [...byId.values()].map(r => ({
  kind: r.kind, airtable_id: r.airtable_id, lat: r.lat, lng: r.lng,
  routes: Object.keys(r.routes).length ? r.routes : null,
  elevation_m: r.elevation_m,
  computed_at: now,
}))

let written = 0
for (let i = 0; i < rows.length; i += 200) {
  const slice = rows.slice(i, i + 200)
  const { error } = await sb.from('listing_geo_facts').upsert(slice, { onConflict: 'kind,airtable_id' })
  if (error) { console.error(`\n  upsert ${i} failed: ${error.message}`); continue }
  written += slice.length
  process.stdout.write(`\r  written ${written}/${rows.length}`)
}

const withRoutes = rows.filter(r => r.routes).length
const withElev = rows.filter(r => r.elevation_m != null).length
console.log(`\ndone. routes for ${withRoutes}, elevation for ${withElev} of ${rows.length}. est. spend $${spent.toFixed(2)}`)
