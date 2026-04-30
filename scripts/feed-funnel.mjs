import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const manifest = await fetch(`${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`).then(r => r.json())
const { data: complexes } = await sb.from('raw_complexes').select('airtable_id, data, slug').limit(500)

const { data: apts } = await sb.from('raw_apartments').select('data').limit(1000)
const apartmentPrices = (apts ?? []).filter(r => r.data?.['Опубликовать'] === true)
  .map(r => ({ title: (r.data['SEO:Title'] ?? '').toLowerCase(), price: Number(r.data['price_usd'] ?? r.data['Цена']) }))
  .filter(a => a.title && a.price > 1000)

const { data: villas } = await sb.from('raw_villas').select('data').limit(1000)
const villaPrices = (villas ?? []).filter(r => r.data?.['Опубликовать'] === true).map(r => {
  const t = r.data['SEO:Title']
  const titleStr = typeof t === 'object' && t?.value ? t.value : (typeof t === 'string' ? t : '')
  return { title: titleStr.toLowerCase(), price: Number(r.data['price'] ?? r.data['Цена']) }
}).filter(v => v.title && v.price > 1000)

let totalC = complexes.length
let withSlug = 0, withName = 0, withPhotos = 0, withPriceFromApts = 0, withPriceFromAny = 0
const dist = new Map()

for (const c of complexes) {
  const name = c.data['Project']
  if (c.slug) withSlug++
  if (typeof name === 'string' && name.trim()) withName++
  const photos = manifest[c.airtable_id] ?? []
  if (photos.length >= 5) withPhotos++
  if (typeof name === 'string') {
    const lower = name.toLowerCase()
    const aptMatches = apartmentPrices.filter(a => a.title.includes(lower))
    const villaMatches = villaPrices.filter(v => v.title.includes(lower))
    if (aptMatches.length > 0) withPriceFromApts++
    if (aptMatches.length > 0 || villaMatches.length > 0) withPriceFromAny++
  }
  const district = (Array.isArray(c.data['Location 2']) ? c.data['Location 2'][0] : c.data['Location 2']) ?? (Array.isArray(c.data['Location']) ? c.data['Location'][0] : c.data['Location'])
  if (district) dist.set(district, (dist.get(district) ?? 0) + 1)
}

console.log('Total complexes:', totalC)
console.log('  with slug:', withSlug)
console.log('  with name:', withName)
console.log('  with ≥5 photos:', withPhotos)
console.log('  with price from apartments:', withPriceFromApts)
console.log('  with price from apts or villas:', withPriceFromAny)
console.log('\nDistrict distribution:')
for (const [d, n] of [...dist.entries()].sort((a,b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(3)}  ${d}`)
}
