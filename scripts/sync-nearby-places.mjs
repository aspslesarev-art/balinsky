import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

const BUCKET = 'competitors'
const MANIFEST_KEY = '_nearby_places.json'
const CACHE_PATH = path.resolve('scripts/_places-cache.json')

const LIMIT_VILLAS = process.argv.includes('--test') ? 3 : Infinity

// searchNearby категории — для каждой делаем 2 прохода (POPULARITY + DISTANCE) и мержим по id
const CATEGORIES_NEARBY = [
  { key: 'beach',       title: 'Пляжи',                 includedTypes: ['beach'],                                radiusM: 5000 },
  { key: 'restaurant',  title: 'Рестораны',             includedTypes: ['restaurant', 'vegan_restaurant', 'vegetarian_restaurant', 'italian_restaurant', 'japanese_restaurant', 'french_restaurant', 'mediterranean_restaurant', 'seafood_restaurant', 'steak_house', 'sushi_restaurant', 'thai_restaurant', 'indian_restaurant', 'chinese_restaurant', 'mexican_restaurant', 'fine_dining_restaurant'], radiusM: 2000 },
  { key: 'cafe',        title: 'Кафе',                  includedTypes: ['cafe', 'coffee_shop', 'breakfast_restaurant', 'brunch_restaurant', 'bakery'], radiusM: 2000 },
  { key: 'nightlife',   title: 'Бары и клубы',          includedTypes: ['bar', 'night_club', 'wine_bar', 'pub'],  radiusM: 3000 },
  { key: 'attraction',  title: 'Достопримечательности', includedTypes: ['tourist_attraction', 'park'],           radiusM: 5000 },
  { key: 'school',      title: 'Школы',                 includedTypes: ['school', 'primary_school', 'secondary_school'], radiusM: 5000 },
  { key: 'preschool',   title: 'Сады и ясли',           includedTypes: ['preschool'],                            radiusM: 3000 },
  { key: 'supermarket', title: 'Магазины',              includedTypes: ['supermarket', 'grocery_store'],         radiusM: 1500 },
  { key: 'pharmacy',    title: 'Аптеки',                includedTypes: ['pharmacy', 'drugstore'],                radiusM: 2000 },
  { key: 'hospital',    title: 'Больницы и клиники',    includedTypes: ['hospital', 'medical_clinic', 'doctor'], radiusM: 5000 },
]
// searchText категории — для тех, что плохо ловятся через includedTypes
const CATEGORIES_TEXT = [
  { key: 'wellness',          title: 'Йога и фитнес',          query: 'yoga studio wellness spa fitness',           radiusM: 1500 },
  { key: 'beachclub',         title: 'Beach clubs',            query: 'beach club',                                  radiusM: 5000 },
  { key: 'international_school', title: 'Международные школы', query: 'international school Bali',                   radiusM: 8000 },
]
const CATEGORIES = [...CATEGORIES_NEARBY, ...CATEGORIES_TEXT]

function loadCache() { try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) } catch { return {} } }
function saveCache(c) { fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2)) }
const cache = loadCache()

function asNum(v) {
  if (v == null) return null
  if (Array.isArray(v)) return asNum(v[0])
  if (typeof v === 'object' && 'value' in v) return asNum(v.value)
  const n = Number(typeof v === 'string' ? v.trim() : v)
  return Number.isFinite(n) ? n : null
}
function firstString(v) {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.shortFormattedAddress',
  'places.googleMapsUri',
].join(',')

async function nearbySearch({ lat, lng, includedTypes, radiusM, rank = 'POPULARITY' }) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GMAPS_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      languageCode: 'ru',
      rankPreference: rank,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusM },
      },
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    return { error: `http_${r.status}`, message: t.slice(0, 200) }
  }
  const j = await r.json()
  return { results: j.places ?? [] }
}

const TEXT_FIELD_MASK = FIELD_MASK
async function textSearch({ lat, lng, query, radiusM }) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GMAPS_KEY,
      'X-Goog-FieldMask': TEXT_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 20,
      languageCode: 'ru',
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusM },
      },
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    return { error: `http_${r.status}`, message: t.slice(0, 200) }
  }
  const j = await r.json()
  return { results: j.places ?? [] }
}

function distKm(aLat, aLng, bLat, bLng) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const la1 = (aLat * Math.PI) / 180
  const la2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function compactPlace(p, villaLat, villaLng) {
  const lat = p.location?.latitude
  const lng = p.location?.longitude
  if (lat == null || lng == null) return null
  return {
    id: p.id,
    name: p.displayName?.text ?? null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviews: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    primaryType: p.primaryType ?? null,
    types: Array.isArray(p.types) ? p.types.slice(0, 4) : [],
    priceLevel: p.priceLevel ?? null,
    address: p.shortFormattedAddress ?? null,
    mapsUrl: p.googleMapsUri ?? null,
    lat, lng,
    distanceKm: distKm(villaLat, villaLng, lat, lng),
  }
}

// Manifest key is `villas` for historic reasons — but the consumer
// (loadNearbyPlaces in lib/nearby-places.ts) just keys by airtable_id,
// so we feed it both villas and apartments. Without apartments here,
// apartment detail pages get a null infra block and the investment map
// renders zero green anchors. Coordinate cache means apartments inside
// an already-synced complex re-use the villa's place lookups for free.
const [villaRes, apartmentRes] = await Promise.all([
  sb.from('raw_villas').select('airtable_id, data').limit(2000),
  sb.from('raw_apartments').select('airtable_id, data').limit(5000),
])
const villaRows = villaRes.data ?? []
const apartmentRows = apartmentRes.data ?? []
console.log('total villas:', villaRows.length, '/ apartments:', apartmentRows.length)

const villas = []
for (const r of [...villaRows, ...apartmentRows]) {
  if (r.data?.['Опубликовать'] !== true) continue
  const lat = asNum(r.data['Geo'])
  const lng = asNum(r.data['Geo 2'])
  if (lat == null || lng == null) continue
  const slug = firstString(r.data['SEO:Slug'])
  villas.push({ id: r.airtable_id, slug, lat, lng })
}
console.log('with coords:', villas.length)

let processed = 0
let calls = 0
const out = {}
const targets = villas.slice(0, LIMIT_VILLAS)

for (const v of targets) {
  const cacheKey = `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`
  let perVilla
  perVilla = cache[cacheKey] ?? {}
  // Fetch only categories missing in cached perVilla (allows incremental adds without full re-fetch)
  const needNearby = CATEGORIES_NEARBY.filter(c => !(c.key in perVilla))
  const needText = CATEGORIES_TEXT.filter(c => !(c.key in perVilla))
  if (needNearby.length > 0 || needText.length > 0) {
    for (const cat of needNearby) {
      // 2 прохода: POPULARITY + DISTANCE — мержим по id для лучшего покрытия
      const merged = new Map()
      for (const rank of ['POPULARITY', 'DISTANCE']) {
        const r = await nearbySearch({ lat: v.lat, lng: v.lng, includedTypes: cat.includedTypes, radiusM: cat.radiusM, rank })
        calls++
        if (r.error) { console.warn(`  ${cacheKey} ${cat.key}/${rank}: ${r.error} ${r.message ?? ''}`); continue }
        for (const p of r.results) {
          if (!merged.has(p.id)) merged.set(p.id, p)
        }
      }
      const items = [...merged.values()]
        .map(p => compactPlace(p, v.lat, v.lng))
        .filter(Boolean)
        .filter(p => !p.types?.includes('lodging'))
        .sort((a, b) => {
          // Composite score: rating × log10(reviews+10). Promotes well-known places
          // with many reviews even if rating is 4.2-4.4 (ZEST, Alchemy etc).
          const score = (x) => (x.rating ?? 0) * Math.log10((x.reviews ?? 0) + 10)
          return score(b) - score(a)
        })
        .slice(0, 30)
      perVilla[cat.key] = items
    }
    for (const cat of needText) {
      const r = await textSearch({ lat: v.lat, lng: v.lng, query: cat.query, radiusM: cat.radiusM })
      calls++
      if (r.error) { console.warn(`  ${cacheKey} ${cat.key}: ${r.error} ${r.message ?? ''}`); perVilla[cat.key] = []; continue }
      const items = r.results
        .map(p => compactPlace(p, v.lat, v.lng))
        .filter(Boolean)
        .filter(p => !p.types?.includes('lodging'))
        .filter(p => p.distanceKm * 1000 <= cat.radiusM)
        .sort((a, b) => {
          // Composite score: rating × log10(reviews+10). Promotes well-known places
          // with many reviews even if rating is 4.2-4.4 (ZEST, Alchemy etc).
          const score = (x) => (x.rating ?? 0) * Math.log10((x.reviews ?? 0) + 10)
          return score(b) - score(a)
        })
        .slice(0, 30)
      perVilla[cat.key] = items
    }
    cache[cacheKey] = perVilla
    if (Object.keys(cache).length % 5 === 0) saveCache(cache)
  }
  out[v.id] = perVilla
  processed++
  if (processed % 10 === 0 || processed === targets.length) {
    console.log(`  ${processed}/${targets.length} villas, ${calls} live API calls`)
  }
}

saveCache(cache)
console.log('Total live API calls:', calls, '(~$' + (calls * 0.032).toFixed(2) + ')')

if (process.argv.includes('--test')) {
  console.log('TEST MODE — sample output:')
  console.log(JSON.stringify(out, null, 2).slice(0, 2500))
  process.exit(0)
}

const payload = { generatedAt: new Date().toISOString(), categories: CATEGORIES.map(c => ({ key: c.key, title: c.title })), villas: out }
const body = JSON.stringify(payload)
console.log('payload:', (body.length / 1024).toFixed(1), 'KB')
const { error } = await sb.storage.from(BUCKET).upload(MANIFEST_KEY, body, { contentType: 'application/json', upsert: true })
if (error) throw error
console.log('uploaded to', `${BUCKET}/${MANIFEST_KEY}`)
