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
  for (let i = 0; i < 50; i++) {
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

const keyCount = new Map()
for (const r of recs) for (const k of Object.keys(r.fields || {})) keyCount.set(k, (keyCount.get(k) ?? 0) + 1)
console.log('\nAll fields (by frequency):')
for (const [k, v] of [...keyCount.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v.toString().padStart(4)}  ${k}`)
}

const richest = recs.reduce((best, r) => {
  const n = Object.keys(r.fields || {}).length
  return n > best.n ? { n, r } : best
}, { n: 0, r: null })
console.log(`\nRichest row (${richest.n} fields):`)
console.log(JSON.stringify(richest.r?.fields, null, 2).slice(0, 3500))

// Show 3 random examples
console.log('\n--- 3 sample rows ---')
for (let i = 0; i < Math.min(3, recs.length); i++) {
  const r = recs[Math.floor(Math.random() * recs.length)]
  console.log('\nFields:', Object.keys(r.fields).join(', '))
  console.log(JSON.stringify(r.fields, null, 2).slice(0, 1500))
}
