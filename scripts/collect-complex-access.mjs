// Traffic-aware drive times from each residential complex to key Bali hubs,
// via Routes API (computeRouteMatrix), + straight-line nearest beach from
// public.bali_places. Writes public.complex_access (upsert on complex_id).
//
// Usage:
//   node scripts/collect-complex-access.mjs --test   # 3 complexes, validate key
//   node scripts/collect-complex-access.mjs          # all complexes
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const KEY = process.env.GOOGLE_PLACES_KEY
const TEST = process.argv.includes('--test')

// Key Bali hubs every investor benchmarks against.
const HUBS = [
  { key: 'airport',  lat: -8.7467, lng: 115.1668 }, // Ngurah Rai / DPS
  { key: 'canggu',   lat: -8.6478, lng: 115.1385 },
  { key: 'seminyak', lat: -8.6905, lng: 115.1683 },
  { key: 'ubud',     lat: -8.5069, lng: 115.2625 },
  { key: 'uluwatu',  lat: -8.8291, lng: 115.0849 },
]

const num = (v) => { const n = Number(String(v ?? '').trim()); return Number.isFinite(n) ? n : null }
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371, d = (x) => x * Math.PI / 180
  const dLat = d(bLat - aLat), dLng = d(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(d(aLat)) * Math.cos(d(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

async function routeMatrix(origins, destinations, departureISO) {
  const body = {
    origins: origins.map(o => ({ waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } } })),
    destinations: destinations.map(d => ({ waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } } })),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    departureTime: departureISO,
  }
  const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`Routes ${r.status}: ${(await r.text()).replace(/\s+/g, ' ').slice(0, 200)}`)
  return r.json() // array of { originIndex, destinationIndex, duration:"123s", distanceMeters, condition }
}

// --- load complexes with coords ---
const { data: rows, error } = await sb.from('raw_complexes').select('airtable_id, data')
if (error) { console.error(error.message); process.exit(1) }
let complexes = rows.map(r => ({
  id: r.airtable_id,
  name: (r.data?.['Social:Title'] ?? '').split(/\s+в\s+/)[0].trim() || null,
  lat: num(r.data?.['Geo']), lng: num(r.data?.['Geo 2']),
})).filter(c => c.id && c.lat && c.lng)
if (TEST) complexes = complexes.slice(0, 3)
console.log(`complexes with coords: ${complexes.length}`)

// --- beaches for nearest-beach ---
const { data: beaches } = await sb.from('bali_places').select('name, lat, lng').contains('cats', ['beach'])
console.log(`beaches for nearest lookup: ${beaches?.length ?? 0}`)

// --- route matrix in batches (TRAFFIC_AWARE: origins*destinations <= 625) ---
const departISO = new Date(Date.now() + 120000).toISOString()
const perBatch = Math.floor(600 / HUBS.length) // ~120 origins
const upserts = []
for (let i = 0; i < complexes.length; i += perBatch) {
  const batch = complexes.slice(i, i + perBatch)
  const elems = await routeMatrix(batch, HUBS, departISO)
  const grid = {} // originIndex -> { hubKey -> {min, km} }
  for (const e of elems) {
    const secs = e.duration ? parseInt(e.duration) : null
    ;(grid[e.originIndex] ??= {})[HUBS[e.destinationIndex].key] = {
      min: secs != null ? Math.round(secs / 60) : null,
      km: e.distanceMeters != null ? +(e.distanceMeters / 1000).toFixed(1) : null,
      ok: e.condition === 'ROUTE_EXISTS',
    }
  }
  batch.forEach((c, idx) => {
    const g = grid[idx] || {}
    let nb = null, nbKm = Infinity
    for (const b of beaches || []) { const k = haversineKm(c.lat, c.lng, b.lat, b.lng); if (k < nbKm) { nbKm = k; nb = b.name } }
    upserts.push({
      complex_id: c.id, name: c.name, lat: c.lat, lng: c.lng,
      drive_airport_min: g.airport?.min ?? null, drive_canggu_min: g.canggu?.min ?? null,
      drive_seminyak_min: g.seminyak?.min ?? null, drive_ubud_min: g.ubud?.min ?? null,
      drive_uluwatu_min: g.uluwatu?.min ?? null,
      dist_airport_km: g.airport?.km ?? null, dist_canggu_km: g.canggu?.km ?? null,
      nearest_beach_name: nb, nearest_beach_km: nbKm === Infinity ? null : +nbKm.toFixed(2),
      measured_at: departISO, data: g,
    })
  })
  console.log(`  routed ${Math.min(i + perBatch, complexes.length)}/${complexes.length}`)
}

// --- write ---
const { error: upErr } = await sb.from('complex_access').upsert(upserts, { onConflict: 'complex_id' })
if (upErr) { console.error('upsert:', upErr.message); process.exit(1) }
console.log(`\ndone. wrote ${upserts.length} rows.`)
// sample
for (const u of upserts.slice(0, 3)) console.log(`  ${u.name}: airport ${u.drive_airport_min}m, canggu ${u.drive_canggu_min}m, beach ${u.nearest_beach_name} ${u.nearest_beach_km}km`)
