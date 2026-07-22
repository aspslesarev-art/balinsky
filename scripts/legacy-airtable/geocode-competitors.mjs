import './_retired.mjs'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const BASE = 'appO4luIhLG3SQx0J'
const TABLE = 'tbl4J14IRlD5MXSvX'
const TOKEN = process.env.AIRTABLE_TOKEN
const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

const CACHE_PATH = path.resolve('scripts/_geocode-cache.json')
const CONCURRENCY = 8

async function fetchAirtable() {
  const out = []
  let offset = ''
  for (let i = 0; i < 500; i++) {
    const url = `https://api.airtable.com/v0/${BASE}/${TABLE}?pageSize=100${offset ? `&offset=${offset}` : ''}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`)
    const j = await r.json()
    out.push(...j.records)
    if (!j.offset) break
    offset = j.offset
  }
  return out
}

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) } catch { return {} }
}
function saveCache(c) { fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2)) }

const inBaliBox = (g, g2) => {
  const a = Number(g), b = Number(g2)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return a >= 114 && a <= 116 && b <= -8 && b >= -9
}

async function geocode(addr) {
  const u = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  u.searchParams.set('address', addr)
  u.searchParams.set('region', 'id')
  u.searchParams.set('bounds', '-9.0,114.4|-8.0,115.8')
  u.searchParams.set('key', GMAPS_KEY)
  const r = await fetch(u)
  if (!r.ok) return { error: `http_${r.status}` }
  const j = await r.json()
  if (j.status === 'OK' && j.results?.[0]?.geometry?.location) {
    const { lat, lng } = j.results[0].geometry.location
    if (lat <= -8 && lat >= -9 && lng >= 114 && lng <= 116) return { lat, lng }
    return { error: 'out_of_bali', lat, lng }
  }
  return { error: j.status || 'unknown' }
}

const recs = await fetchAirtable()
console.log('Total records:', recs.length)

const cache = loadCache()
const addresses = new Set()
for (const r of recs) {
  const f = r.fields || {}
  const price = Number(f['Цена за ночь'])
  if (!Number.isFinite(price) || price <= 0) continue
  if (inBaliBox(f['Geo'], f['Geo 2'])) continue
  const addr = (f['Адрес'] || f['Adress'] || '').trim()
  if (!addr || addr.length < 10 || addr.toLowerCase() === ', bali, indonesia') continue
  addresses.add(addr)
}
const todo = [...addresses].filter(a => !(a.toLowerCase() in cache))
console.log('Unique addresses:', addresses.size, 'cached:', addresses.size - todo.length, 'todo:', todo.length)

let done = 0
async function worker(list) {
  for (const addr of list) {
    const result = await geocode(addr)
    cache[addr.toLowerCase()] = { ...result, t: Date.now() }
    done++
    if (done % 50 === 0) {
      console.log(`  ${done}/${todo.length}  last: "${addr.slice(0, 50)}" ->`, result.lat ? `${result.lat.toFixed(4)},${result.lng.toFixed(4)}` : result.error)
      saveCache(cache)
    }
  }
}
const chunkSize = Math.ceil(todo.length / CONCURRENCY)
const chunks = []
for (let i = 0; i < CONCURRENCY; i++) chunks.push(todo.slice(i * chunkSize, (i + 1) * chunkSize))
await Promise.all(chunks.map(worker))
saveCache(cache)
console.log('Geocoded total:', done)

let ok = 0, errs = 0
for (const v of Object.values(cache)) {
  if (v.lat != null && v.error == null) ok++
  else errs++
}
console.log('Cache: ok =', ok, '/ err =', errs, '/ total =', Object.keys(cache).length)
