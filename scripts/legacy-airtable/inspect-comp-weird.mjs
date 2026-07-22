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

// Look for southern-Bali records: address contains Pandawa, Bukit, Uluwatu, Nusa Dua, Jimbaran, Pecatu
const southKeys = ['pandawa', 'bukit', 'uluwatu', 'nusa dua', 'nusa-dua', 'jimbaran', 'pecatu', 'kuta']
const southMatches = []
for (const r of recs) {
  const addr = (r.fields?.['Адрес'] || r.fields?.['Adress'] || '').toLowerCase()
  for (const k of southKeys) {
    if (addr.includes(k)) {
      southMatches.push({
        addr: addr.slice(0, 70),
        Geo: r.fields['Geo'],
        'Geo 2': r.fields['Geo 2'],
        price: r.fields['Цена за ночь'],
        link: r.fields['Link on map'],
      })
      break
    }
  }
}
console.log('Records with southern-Bali in address:', southMatches.length)
console.log('First 10 samples:')
for (const m of southMatches.slice(0, 10)) {
  console.log(JSON.stringify(m))
}

// Stats on Geo values: are they small integers (like review counts) for these?
const numericPattern = []
for (const m of southMatches) {
  numericPattern.push({ Geo: typeof m.Geo === 'number' ? m.Geo : Number(m.Geo), 'Geo 2': typeof m['Geo 2'] === 'number' ? m['Geo 2'] : Number(m['Geo 2']) })
}
const inBaliBox = numericPattern.filter(p => p.Geo > 114 && p.Geo < 116 && p['Geo 2'] < -8 && p['Geo 2'] > -9).length
const inverted = numericPattern.filter(p => p['Geo 2'] > 114 && p['Geo 2'] < 116 && p.Geo < -8 && p.Geo > -9).length
const small = numericPattern.filter(p => Math.abs(p.Geo) < 100 && Math.abs(p['Geo 2']) < 100).length
console.log('south records: in Bali box:', inBaliBox, 'inverted:', inverted, 'small numbers:', small, 'of', numericPattern.length)
