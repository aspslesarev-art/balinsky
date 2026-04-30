import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// 1) Apartments: distribution of filter-relevant fields
const { data: apts, error } = await sb.from('raw_apartments').select('data')
if (error) { console.error(error); process.exit(1) }
console.log('Fetched:', apts?.length)
const pub = (apts ?? []).filter(r => r.data?.['Опубликовать'] === true)
console.log('Published:', pub.length)

function freq(rows, key, transform = v => v) {
  const m = new Map()
  for (const r of rows) {
    const v = transform(r.data[key])
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue
    const arr = Array.isArray(v) ? v : [v]
    for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

console.log('\n=== Комнаты ===')
for (const [v, c] of freq(pub, 'Комнаты')) console.log(`  ${c.toString().padStart(4)}  ${v}`)

console.log('\n=== Этаж ===')
for (const [v, c] of freq(pub, 'Этаж')) console.log(`  ${c.toString().padStart(4)}  ${v}`)

console.log('\n=== Статус ===')
for (const [v, c] of freq(pub, 'Статус')) console.log(`  ${c.toString().padStart(4)}  ${v}`)

console.log('\n=== Разрешение ===')
for (const [v, c] of freq(pub, 'Разрешение')) console.log(`  ${c.toString().padStart(4)}  ${v}`)

console.log('\n=== Location filter (cleartext) ===')
for (const [v, c] of freq(pub, 'Location filter')) console.log(`  ${c.toString().padStart(4)}  ${v}`)

console.log('\n=== Location (refs) — top 10 ===')
const locRefs = freq(pub, 'Location').slice(0, 10)
for (const [v, c] of locRefs) console.log(`  ${c.toString().padStart(4)}  ${v}`)

console.log('\n=== Developer (refs) — top 10 ===')
const devRefs = freq(pub, 'Developer').slice(0, 10)
for (const [v, c] of devRefs) console.log(`  ${c.toString().padStart(4)}  ${v}`)

// price range
const prices = pub.map(r => Number(r.data['price_usd'] ?? r.data['Цена'])).filter(Number.isFinite)
console.log('\n=== Price ===')
console.log('  n:', prices.length)
console.log('  min:', Math.min(...prices))
console.log('  max:', Math.max(...prices))
console.log('  p10:', prices.sort((a,b)=>a-b)[Math.floor(prices.length * 0.1)])
console.log('  p50:', prices.sort((a,b)=>a-b)[Math.floor(prices.length * 0.5)])
console.log('  p90:', prices.sort((a,b)=>a-b)[Math.floor(prices.length * 0.9)])

// 2) Resolve Developer: check raw_developers
console.log('\n=== raw_developers lookup ===')
const devIds = new Set()
for (const r of pub) {
  const d = r.data['Developer']
  if (Array.isArray(d)) d.forEach(id => devIds.add(id))
}
console.log('unique developer refs in apartments:', devIds.size)
const { data: devs } = await sb.from('raw_developers').select('airtable_id, data').in('airtable_id', [...devIds])
console.log('matched in raw_developers:', devs?.length)
if (devs?.[0]) console.log('sample developer data.Developer:', devs[0].data?.Developer)

// 3) Location refs — is there a table for that?
console.log('\n=== Location refs ===')
const locIds = new Set()
for (const r of pub) {
  const l = r.data['Location']
  if (Array.isArray(l)) l.forEach(id => locIds.add(id))
}
console.log('unique location refs:', locIds.size)
// Check: are these same as "Location filter" text? How often is Location filter present vs missing?
const withBoth = pub.filter(r => r.data['Location filter'] && Array.isArray(r.data['Location']))
const withLocNoFilter = pub.filter(r => !r.data['Location filter'] && Array.isArray(r.data['Location']))
const withFilterNoLoc = pub.filter(r => r.data['Location filter'] && !Array.isArray(r.data['Location']))
console.log('with Location filter + Location ref:', withBoth.length)
console.log('with Location ref but no Location filter:', withLocNoFilter.length)
console.log('with Location filter but no Location ref:', withFilterNoLoc.length)
