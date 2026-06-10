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
const inBox = (g, g2) => {
  const a = Number(g), b = Number(g2)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return a >= 114 && a <= 116 && b <= -8 && b >= -9
}

let needsGeo = 0
const uniqueAddrs = new Set()
for (const r of recs) {
  const f = r.fields || {}
  const price = Number(f['Цена за ночь'])
  if (!Number.isFinite(price) || price <= 0) continue
  if (inBox(f['Geo'], f['Geo 2'])) continue
  const addr = (f['Адрес'] || f['Adress'] || '').trim()
  if (!addr || addr === ', Bali, Indonesia' || addr.length < 10) continue
  needsGeo++
  uniqueAddrs.add(addr.toLowerCase())
}
console.log('records needing geo (have price + address but no valid coords):', needsGeo)
console.log('unique addresses to geocode:', uniqueAddrs.size)
console.log('\nfirst 8 unique addrs:')
for (const a of [...uniqueAddrs].slice(0, 8)) console.log(' -', a)
