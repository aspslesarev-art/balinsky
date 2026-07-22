import './_retired.mjs'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const BASE = 'appO4luIhLG3SQx0J'
const TABLE = 'tbl4J14IRlD5MXSvX'
const TOKEN = process.env.AIRTABLE_TOKEN

async function fetchAll() {
  const out = []
  let offset = ''
  for (let i = 0; i < 500; i++) {
    const url = `https://api.airtable.com/v0/${BASE}/${TABLE}?pageSize=100${offset ? `&offset=${offset}` : ''}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) { console.error(r.status, await r.text()); process.exit(1) }
    const j = await r.json()
    out.push(...j.records)
    if (!j.offset) break
    offset = j.offset
  }
  return out
}

const recs = await fetchAll()
console.log('Total records:', recs.length)

let bothNum = 0, geoLat = 0, geoLng = 0, weird = 0
const samples = { latLng: [], lngLat: [] }
for (const r of recs) {
  const f = r.fields || {}
  const a = Number(f['Geo'])
  const b = Number(f['Geo 2'])
  if (!Number.isFinite(a) || !Number.isFinite(b)) continue
  bothNum++
  // Bali ranges: lat [-9, -8], lng [114, 116]
  const aIsLat = a >= -9 && a <= -8
  const aIsLng = a >= 114 && a <= 116
  const bIsLat = b >= -9 && b <= -8
  const bIsLng = b >= 114 && b <= 116
  if (aIsLng && bIsLat) { geoLng++; if (samples.lngLat.length < 3) samples.lngLat.push({ name: f['Адрес']?.slice?.(0, 60), Geo: a, 'Geo 2': b }) }
  else if (aIsLat && bIsLng) { geoLat++; if (samples.latLng.length < 3) samples.latLng.push({ name: f['Адрес']?.slice?.(0, 60), Geo: a, 'Geo 2': b }) }
  else weird++
}
console.log('records with two numeric geos:', bothNum)
console.log('  Geo=lng, Geo 2=lat:', geoLng)
console.log('  Geo=lat, Geo 2=lng:', geoLat)
console.log('  weird (out of Bali bounds):', weird)
console.log('\nsamples Geo=lng, Geo 2=lat:', samples.lngLat)
console.log('\nsamples Geo=lat, Geo 2=lng:', samples.latLng)
