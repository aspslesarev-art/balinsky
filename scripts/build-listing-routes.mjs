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
import sharp from 'sharp'
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
// Elevation is nearly free while Routes is not, so allow topping up altitudes
// alone — e.g. after the Elevation API is finally enabled on the project.
const ELEVATION_ONLY = ARGS.includes('--elevation-only')
// A route measured at 2am and one measured at 10am are different roads on Bali
// (Bingin→airport: 46 min vs 75). With --departure the run computes the rush
// hour figure and lands it in routes_peak, leaving the free-flow one intact.
const DEPARTURE = (ARGS.find(a => a.startsWith('--departure=')) || '').split('=')[1] || null
// Restrict to some listing kinds — the complex page is what renders these, and
// villas/apartments can be topped up later without re-buying complexes.
const KINDS = ((ARGS.find(a => a.startsWith('--kinds=')) || '').split('=')[1] || '').split(',').filter(Boolean)
// Approach-road quality: Street View coverage (free) plus a motorbike routing
// of the same trip, which exposes the detours a car is forced into.
const ACCESS = ARGS.includes('--access')
// One Street View frame per listing, looking from the road at the building.
// A photo of the actual approach beats any adjective we could write about it.
const SV_PHOTOS = ARGS.includes('--sv-photos')
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
  const kindFiltered = KINDS.length ? rows.filter(r => KINDS.includes(r.kind)) : rows
  if (!ONLY_MISSING) return kindFiltered
  rows.length = 0
  rows.push(...kindFiltered)

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

async function routeMatrix(origins, mode = 'DRIVE') {
  const body = {
    origins: origins.map(o => ({ waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } } })),
    destinations: DESTS.map(([, lat, lng]) => ({ waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } })),
    travelMode: mode,
    routingPreference: TRAFFIC ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
  }
  // Routes rejects a departureTime in the past, so the caller passes the next
  // upcoming weekday morning rather than "last Friday at 10".
  if (DEPARTURE) body.departureTime = DEPARTURE
  const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      // staticDuration is the same route with no traffic at all. It rides along
      // free, so one request gives both "clear road" and "at this hour".
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,staticDuration,distanceMeters,condition',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`routes ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}

// Street View metadata is free and tells us whether Google's car ever drove
// past — the most honest available proxy for "a car can reach this address".
async function streetView(lat, lng) {
  const r = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=150&key=${encodeURIComponent(KEY)}`)
  if (!r.ok) return null
  const j = await r.json()
  if (j.status !== 'OK' || !j.location) return { date: null, dist_m: null, status: j.status }
  return {
    date: j.date ?? null,
    dist_m: haversineM(lat, lng, j.location.lat, j.location.lng),
    status: 'OK',
    loc: j.location,
  }
}

/** Compass bearing from the panorama to the building, so the camera looks at it. */
function bearing(lat1, lng1, lat2, lng2) {
  const rad = (x) => (x * Math.PI) / 180
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2))
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1))
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = (x) => (x * Math.PI) / 180
  return Math.round(R * Math.acos(Math.min(1, Math.max(-1,
    Math.sin(rad(lat1)) * Math.sin(rad(lat2)) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2) - rad(lng1))))))
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

if (SV_PHOTOS) {
  // Street View Static bills per image ($7/1000), so this is a one-off: fetch,
  // re-encode to WebP and park it in our own Storage, exactly like the place
  // photos. Google's watermark stays on the frame — that is the attribution
  // their terms require.
  const BUCKET = 'places'
  console.log(`street view photos: ${listings.length} listings ≈ $${(listings.length * 0.007).toFixed(2)}`)
  if (DRY) process.exit(0)

  let ok = 0, none = 0
  const rows = []
  for (const [idx, l] of listings.entries()) {
    const sv = await streetView(l.lat, l.lng).catch(() => null)
    if (!sv || sv.status !== 'OK' || !sv.loc) { none++; continue }
    // Look from the road towards the building, not along the street.
    const heading = bearing(sv.loc.lat, sv.loc.lng, l.lat, l.lng)
    const url = 'https://maps.googleapis.com/maps/api/streetview'
      + `?size=640x360&location=${sv.loc.lat},${sv.loc.lng}&heading=${heading}&pitch=2&fov=80&key=${encodeURIComponent(KEY)}`
    try {
      const r = await fetch(url)
      if (!r.ok) { none++; continue }
      const buf = await sharp(Buffer.from(await r.arrayBuffer()), { failOn: 'none' }).webp({ quality: 74 }).toBuffer()
      const key = `sv/${l.kind}-${l.airtable_id}.webp`
      const { error } = await sb.storage.from(BUCKET).upload(key, buf, { contentType: 'image/webp', upsert: true })
      if (error) { console.error(`\n  upload ${l.airtable_id}: ${error.message}`); continue }
      const { data: cur } = await sb.from('listing_geo_facts')
        .select('access').eq('kind', l.kind).eq('airtable_id', l.airtable_id).maybeSingle()
      const access = { ...(cur?.access ?? {}) }
      access.sv = { ...(access.sv ?? {}), date: sv.date, dist_m: sv.dist_m, status: 'OK',
        url: `${SB_URL}/storage/v1/object/public/${BUCKET}/${key}` }
      rows.push({ kind: l.kind, airtable_id: l.airtable_id, lat: l.lat, lng: l.lng, access })
      ok++
    } catch (e) {
      if (none < 3) console.error(`\n  ${l.airtable_id}: ${e.message}`)
      none++
    }
    if ((idx + 1) % 20 === 0) process.stdout.write(`\r  ${idx + 1}/${listings.length}  ok=${ok} skipped=${none}`)
  }

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await sb.from('listing_geo_facts').upsert(rows.slice(i, i + 100), { onConflict: 'kind,airtable_id' })
    if (error) console.error(`\n  upsert ${i}: ${error.message}`)
  }
  console.log(`\nstreet view photos: ${ok} saved, ${none} without coverage. est. spend $${(ok * 0.007).toFixed(2)}`)
  process.exit(0)
}

if (ACCESS) {
  // Street View costs nothing; the motorbike comparison is one billed element
  // per listing (the car figure comes from the routes we already bought).
  const [, aLat, aLng] = DESTS[0]   // airport as the common anchor
  console.log(`access: ${listings.length} listings — Street View free + 1 bike element each ≈ $${(listings.length * COST_PER_ELEMENT).toFixed(2)}`)
  if (DRY) process.exit(0)

  const existing = new Map()
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('listing_geo_facts').select('kind,airtable_id,routes_peak,routes').range(from, from + 999)
    for (const r of data ?? []) existing.set(`${r.kind}|${r.airtable_id}`, r.routes_peak ?? r.routes ?? null)
    if (!data || data.length < 1000) break
  }

  const rows = []
  for (let i = 0; i < listings.length; i += ORIGINS_PER_REQ) {
    const batch = listings.slice(i, i + ORIGINS_PER_REQ)
    let bike = []
    try {
      bike = await routeMatrix(batch.map(b => ({ ...b })), 'TWO_WHEELER')
    } catch (e) {
      console.error(`\n  bike batch ${i} failed: ${e.message}`)
    }
    const bikeTo = new Map()
    for (const cell of bike) {
      if (cell.duration == null || (cell.destinationIndex ?? 0) !== 0) continue
      const o = batch[cell.originIndex ?? 0]
      if (o) bikeTo.set(`${o.kind}|${o.airtable_id}`, { s: Number(String(cell.duration).replace('s', '')), m: cell.distanceMeters ?? null })
    }

    for (const l of batch) {
      const key = `${l.kind}|${l.airtable_id}`
      const sv = await streetView(l.lat, l.lng).catch(() => null)
      const car = existing.get(key)?.airport ?? null
      const straight = haversineM(l.lat, l.lng, aLat, aLng)
      rows.push({
        kind: l.kind, airtable_id: l.airtable_id, lat: l.lat, lng: l.lng,
        access: {
          sv,
          car: car ? { s: car.s, m: car.m } : null,
          bike: bikeTo.get(key) ?? null,
          detour: car?.m && straight ? +(car.m / straight).toFixed(2) : null,
        },
      })
    }
    process.stdout.write(`\r  ${Math.min(i + ORIGINS_PER_REQ, listings.length)}/${listings.length}`)
  }

  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from('listing_geo_facts').upsert(rows.slice(i, i + 200), { onConflict: 'kind,airtable_id' })
    if (error) console.error(`\n  upsert ${i} failed: ${error.message}`)
  }
  const withSv = rows.filter(r => r.access.sv?.status === 'OK').length
  console.log(`\naccess written for ${rows.length}; Street View found for ${withSv}. est. spend $${(listings.length * COST_PER_ELEMENT).toFixed(2)}`)
  process.exit(0)
}

const elements = listings.length * DESTS.length
const estimate = elements * COST_PER_ELEMENT

console.log(`listings=${listings.length}  destinations=${DESTS.length}  elements=${elements}`)
console.log(`  mode=${TRAFFIC ? 'traffic-aware' : 'free-flow'}  est. cost $${estimate.toFixed(2)}  (cap $${CAP})`)
if (!ELEVATION_ONLY && estimate > CAP) {
  console.error('!! estimate exceeds cap — raise --cap or drop destinations')
  process.exit(1)
}
if (DRY) process.exit(0)

const now = new Date().toISOString()
const byId = new Map()
for (const l of listings) byId.set(`${l.kind}|${l.airtable_id}`, { ...l, routes: {}, elevation_m: null })

let spent = 0
for (let i = 0; !ELEVATION_ONLY && i < listings.length; i += ORIGINS_PER_REQ) {
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
    rec.routes[dest[0]] = {
      s: Number(String(cell.duration).replace('s', '')),
      static_s: cell.staticDuration != null ? Number(String(cell.staticDuration).replace('s', '')) : null,
      m: cell.distanceMeters ?? null,
    }
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

// In elevation-only mode the payload deliberately omits `routes`: PostgREST
// updates just the columns it receives, so the existing (paid for) drive times
// survive instead of being overwritten with null.
const rows = [...byId.values()].map(r => (ELEVATION_ONLY
  ? { kind: r.kind, airtable_id: r.airtable_id, lat: r.lat, lng: r.lng, elevation_m: r.elevation_m, computed_at: now }
  : DEPARTURE
  ? {
      kind: r.kind, airtable_id: r.airtable_id, lat: r.lat, lng: r.lng,
      routes_peak: Object.keys(r.routes).length ? r.routes : null,
      routes_peak_at: DEPARTURE,
    }
  : {
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
