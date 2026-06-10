// One-off, cost-bounded Google Places sweep for the Bali districts where we
// have no listings (so _nearby_places never covered them). Pulls only the
// tourist-interesting categories, one page each, and writes the raw POIs to
// competitors/_heat_anchors.json. build-heat-pois.mjs then folds these in
// alongside the per-listing POIs.
//
// Cost: ~7 Places calls per anchor (1 page, 1 rank). ~14 anchors ≈ 100 calls.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
// Dedicated server key (no referrer restriction) — the public maps key 403s
// on server-side Places calls.
const GMAPS_KEY = process.env.GOOGLE_PLACES_KEY
const BUCKET = 'competitors'
const OUT_KEY = '_heat_anchors.json'

// District centres with no nearby coverage (verified empty in _heat_pois.json).
const ANCHORS = [
  ['Lovina', -8.158, 115.025], ['Singaraja', -8.112, 115.088], ['Pemuteran', -8.140, 114.660],
  ['Munduk', -8.265, 115.070], ['Bedugul', -8.275, 115.165], ['Jatiluwih', -8.371, 115.130],
  ['Kintamani', -8.245, 115.375], ['Sidemen', -8.435, 115.445], ['Candidasa', -8.510, 115.567],
  ['Amed', -8.339, 115.687], ['Tulamben', -8.275, 115.592], ['Medewi', -8.420, 114.800],
  ['Nusa Penida', -8.727, 115.545], ['Nusa Ceningan', -8.690, 115.455],
  // Emerging west-coast strip Canggu→Tanah Lot (no listings yet, big anchors
  // like Nuanu Creative City / Luna Beach Club).
  ['Nuanu/Kedungu', -8.553, 115.085], ['Nyanyi/Beraban', -8.575, 115.092], ['Cemagi/Seseh', -8.628, 115.103],
]

const NEARBY_CATS = [
  { key: 'restaurant', includedTypes: ['restaurant', 'fine_dining_restaurant', 'seafood_restaurant', 'italian_restaurant', 'japanese_restaurant', 'steak_house', 'sushi_restaurant'], radiusM: 4000 },
  { key: 'cafe', includedTypes: ['cafe', 'coffee_shop', 'bakery'], radiusM: 4000 },
  { key: 'nightlife', includedTypes: ['bar', 'night_club', 'wine_bar', 'pub'], radiusM: 5000 },
  { key: 'attraction', includedTypes: ['tourist_attraction', 'park'], radiusM: 8000 },
  { key: 'beach', includedTypes: ['beach'], radiusM: 8000 },
]
const TEXT_CATS = [
  { key: 'wellness', query: 'yoga studio wellness spa fitness', radiusM: 4000 },
  { key: 'beachclub', query: 'beach club', radiusM: 8000 },
]

const FIELD_MASK = ['places.id', 'places.location', 'places.primaryType', 'places.userRatingCount', 'places.priceLevel'].join(',')

async function nearbySearch(lat, lng, includedTypes, radiusM) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GMAPS_KEY, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify({ includedTypes, maxResultCount: 20, languageCode: 'ru', rankPreference: 'POPULARITY', locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusM } } }),
  })
  if (!r.ok) { console.warn('  nearby', r.status, (await r.text()).slice(0, 120)); return [] }
  return (await r.json()).places ?? []
}
async function textSearch(lat, lng, query, radiusM) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GMAPS_KEY, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify({ textQuery: query, pageSize: 20, languageCode: 'ru', locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusM } } }),
  })
  if (!r.ok) { console.warn('  text', r.status, (await r.text()).slice(0, 120)); return [] }
  return (await r.json()).places ?? []
}

const out = new Map() // id -> { id, lat, lng, reviews, priceLevel, cat }
let calls = 0
function add(places, cat) {
  for (const p of places) {
    const loc = p.location
    if (!p.id || !loc || typeof loc.latitude !== 'number') continue
    if (out.has(p.id)) continue
    out.set(p.id, { id: p.id, lat: loc.latitude, lng: loc.longitude, reviews: p.userRatingCount ?? 0, priceLevel: p.priceLevel ?? null, cat })
  }
}

for (const [name, lat, lng] of ANCHORS) {
  console.log(`anchor: ${name}`)
  for (const c of NEARBY_CATS) { add(await nearbySearch(lat, lng, c.includedTypes, c.radiusM), c.key); calls++ }
  for (const c of TEXT_CATS) { add(await textSearch(lat, lng, c.query, c.radiusM), c.key); calls++ }
}
console.log(`Places calls: ${calls}, unique POIs collected: ${out.size}`)

const payload = { generatedAt: new Date().toISOString(), places: [...out.values()] }
const sb = createClient(SUPABASE_URL, SERVICE_KEY)
const { error } = await sb.storage.from(BUCKET).upload(OUT_KEY, JSON.stringify(payload), { contentType: 'application/json', upsert: true })
if (error) { console.error('upload failed:', error.message); process.exit(1) }
console.log(`uploaded ${BUCKET}/${OUT_KEY} (${out.size} POIs from ${calls} calls)`)
