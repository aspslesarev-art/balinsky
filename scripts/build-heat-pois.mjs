// Build the reviews-heatmap source from the Google Places POIs we already
// collected per listing (_nearby_places/<id>.json). We keep only the
// tourist-interesting categories, drop cheap local spots (warungs), dedupe by
// Google place id across listings, and aggregate review counts into a ~0.5km
// grid. Output is one small file the app reads: competitors/_heat_pois.json.
//
// Zero new Google spend — reuses already-fetched nearby data. Re-run after a
// nearby-places sync to refresh.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

// Load .env.local (scripts run outside Next).
const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET = 'competitors'
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/_nearby_places.json`
const FILE_URL = (id) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/_nearby_places/${id}.json`
const OUT_KEY = '_heat_pois.json'

// Tourist-interesting categories only. Everything else (schools, supermarkets,
// pharmacies, hospitals, malls, ferries, coworking) is excluded.
const TOURIST = new Set(['restaurant', 'cafe', 'nightlife', 'attraction', 'wellness', 'beach', 'beachclub'])
// Price filter applies to food/drink/wellness — drop the cheap segment
// (warungs). Attractions/beaches/clubs are free or fixed, kept regardless.
const PRICED = new Set(['restaurant', 'cafe', 'nightlife', 'wellness'])
const CHEAP = new Set(['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_FREE'])

const CELL = 0.0045 // ~500 m

async function fetchJson(url) {
  const r = await fetch(url)
  if (!r.ok) return null
  return r.json()
}

async function mapLimit(items, limit, fn) {
  const out = []
  let i = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]) }
  }))
  return out
}

const idx = await fetchJson(INDEX_URL)
const ids = idx?.ids ?? []
console.log(`nearby listings: ${ids.length}`)

const places = new Map() // place id -> { lat, lng, reviews }
let scanned = 0
await mapLimit(ids, 24, async (id) => {
  const f = await fetchJson(FILE_URL(id)).catch(() => null)
  scanned++
  if (scanned % 100 === 0) console.log(`  scanned ${scanned}/${ids.length}`)
  if (!f) return
  for (const cat of Object.keys(f)) {
    if (!TOURIST.has(cat)) continue
    for (const p of (f[cat] ?? [])) {
      if (!p || !p.id || typeof p.lat !== 'number' || typeof p.lng !== 'number') continue
      if ((p.reviews ?? 0) <= 0) continue
      if (PRICED.has(cat) && p.priceLevel && CHEAP.has(p.priceLevel)) continue
      if (!places.has(p.id)) places.set(p.id, { lat: p.lat, lng: p.lng, reviews: p.reviews })
    }
  }
})
console.log(`unique tourist POIs: ${places.size}`)

// Aggregate into a grid.
const grid = new Map()
for (const p of places.values()) {
  const k = `${Math.round(p.lat / CELL)}:${Math.round(p.lng / CELL)}`
  let g = grid.get(k)
  if (!g) { g = { latSum: 0, lngSum: 0, weight: 0, n: 0 }; grid.set(k, g) }
  g.latSum += p.lat; g.lngSum += p.lng; g.weight += p.reviews; g.n++
}
const cells = [...grid.values()].map(g => ({
  lat: +(g.latSum / g.n).toFixed(5),
  lng: +(g.lngSum / g.n).toFixed(5),
  weight: g.weight,
}))
const sorted = cells.map(c => c.weight).sort((a, b) => a - b)
const max = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.92)] : 1
const payload = { generatedAt: new Date().toISOString(), cells, max: Math.max(1, max) }
console.log(`grid cells: ${cells.length}, max(p92): ${payload.max}`)

const sb = createClient(SUPABASE_URL, SERVICE_KEY)
const { error } = await sb.storage.from(BUCKET).upload(OUT_KEY, JSON.stringify(payload), {
  contentType: 'application/json', upsert: true,
})
if (error) { console.error('upload failed:', error.message); process.exit(1) }
console.log(`uploaded ${BUCKET}/${OUT_KEY} (${cells.length} cells)`)
