import './_retired.mjs'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const AIRTABLE_BASE = 'appO4luIhLG3SQx0J'
const AIRTABLE_TABLE = 'tbl4J14IRlD5MXSvX'
const BUCKET = 'competitors'
const MANIFEST_KEY = '_competitors.json'
const GEO_CACHE_PATH = path.resolve('scripts/_geocode-cache.json')

let geoCache = {}
try { geoCache = JSON.parse(fs.readFileSync(GEO_CACHE_PATH, 'utf8')) } catch { geoCache = {} }
console.log('Geocode cache entries:', Object.keys(geoCache).length)

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets()
  if (error) throw error
  if (buckets.some(b => b.name === BUCKET)) return
  const { error: cErr } = await sb.storage.createBucket(BUCKET, { public: true })
  if (cErr) throw cErr
  console.log(`created bucket ${BUCKET}`)
}

async function fetchAirtableAll() {
  const all = []
  let offset
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    })
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`)
    const j = await r.json()
    all.push(...j.records)
    offset = j.offset
  } while (offset)
  return all
}

// Bali bounding box
const LAT_MIN = -9.0, LAT_MAX = -8.0
const LNG_MIN = 114.4, LNG_MAX = 115.8

function asNumber(v) {
  if (v == null || v === '') return null
  const n = Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

function firstString(v) {
  if (v == null) return null
  if (Array.isArray(v)) return v[0] != null ? String(v[0]) : null
  if (typeof v === 'object' && 'value' in v) return v.value != null ? String(v.value) : null
  return String(v)
}

console.log('Fetching Airtable…')
await ensureBucket()
const recs = await fetchAirtableAll()
console.log('Total records:', recs.length)

const items = []
let dropped = { coords: 0, price: 0, name: 0 }
let geocoded = 0
for (const r of recs) {
  const f = r.fields || {}
  let lng = asNumber(f['Geo'])
  let lat = asNumber(f['Geo 2'])
  const validBox = lat != null && lng != null && lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX
  if (!validBox) {
    const addr = firstString(f['Адрес']) || firstString(f['Adress'])
    const cached = addr ? geoCache[addr.trim().toLowerCase()] : null
    if (cached?.lat != null && cached?.lng != null && !cached.error) {
      lat = cached.lat; lng = cached.lng; geocoded++
    } else { dropped.coords++; continue }
  }
  const price = asNumber(f['Цена за ночь'])
  if (price == null || price <= 0) { dropped.price++; continue }
  const name = firstString(f['Name']) || firstString(f['Комплекс'])
  if (!name) { dropped.name++; continue }

  items.push({
    id: r.id,
    name: String(name).slice(0, 200),
    complex: firstString(f['Комплекс']) || null,
    address: firstString(f['Адрес']) || firstString(f['Adress']) || null,
    lat, lng,
    price,
    bedrooms: asNumber(f['Спальни']),
    area: asNumber(f['Площадь']),
    pool: firstString(f['Бассейн']) || null,
    view: firstString(f['Вид']) || null,
    rating: asNumber(f['Рейтинг']),
    reviews: asNumber(f['Отзывы']),
    photo: firstString(f['Фото']) || null,
    url: firstString(f['URL']) || null,
    date: firstString(f['Дата']) || null,
  })
}

console.log('Kept:', items.length, '(geocoded:', geocoded, ')')
console.log('Dropped:', dropped)

const payload = {
  generatedAt: new Date().toISOString(),
  count: items.length,
  items,
}

const body = JSON.stringify(payload)
console.log('Payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error: upErr } = await sb.storage.from(BUCKET).upload(MANIFEST_KEY, body, {
  contentType: 'application/json',
  upsert: true,
})
if (upErr) throw upErr
console.log('Uploaded to', `${BUCKET}/${MANIFEST_KEY}`)

// Spatial shards: 0.05° ≈ 5.5 km cells. loadNearby (2 km radius) fetches at
// most 4 cells (~280 KB) instead of the full 10.5 MB manifest. Each snapshot
// build was egressing the whole file — multiply by views = bulk of our bill.
const CELL = 0.05
const cellKey = (lat, lng) => `${Math.floor(lat / CELL)}_${Math.floor(lng / CELL)}`
const byCell = new Map()
for (const it of items) {
  if (typeof it.lat !== 'number' || typeof it.lng !== 'number') continue
  const k = cellKey(it.lat, it.lng)
  let bucket = byCell.get(k)
  if (!bucket) { bucket = []; byCell.set(k, bucket) }
  bucket.push(it)
}
const cellIndex = { generatedAt: new Date().toISOString(), cellDeg: CELL, cells: [...byCell.keys()] }
const { error: idxErr } = await sb.storage.from(BUCKET).upload('_cells.json',
  JSON.stringify(cellIndex), { contentType: 'application/json', upsert: true })
if (idxErr) throw idxErr
console.log('Cells:', byCell.size, 'index uploaded')

let cellUploaded = 0
let cellFailed = 0
const cellEntries = [...byCell.entries()]
async function uploadCell(k, list, attempt = 1) {
  const key = `_cells/${k}.json`
  const cellBody = JSON.stringify(list)
  const { error } = await sb.storage.from(BUCKET).upload(key, cellBody, { contentType: 'application/json', upsert: true })
  if (!error) return
  if (attempt < 4) {
    await new Promise(res => setTimeout(res, 500 * attempt))
    return uploadCell(k, list, attempt + 1)
  }
  cellFailed++
  console.warn(`  ✖ ${k}: ${error.message}`)
}
for (let i = 0; i < cellEntries.length; i += 4) {
  const batch = cellEntries.slice(i, i + 4)
  await Promise.all(batch.map(([k, list]) => uploadCell(k, list)))
  cellUploaded += batch.length
  if (cellUploaded % 20 === 0 || cellUploaded === cellEntries.length) {
    console.log(`  cell uploads: ${cellUploaded}/${cellEntries.length} (${cellFailed} failed)`)
  }
}
console.log(`done — ${cellEntries.length - cellFailed}/${cellEntries.length} cells uploaded`)
