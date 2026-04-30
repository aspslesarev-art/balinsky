import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(1000)
const pub = data.filter(r => r.data?.['Опубликовать'] === true)
console.log('total:', data.length, 'published:', pub.length)

let withSlug = 0
let withGoodSlug = 0
let withTitle = 0
let withSeoTitle = 0
let withGeo = 0
let withName = 0
let withImyaENG = 0
const slugSamples = []
const titleSamples = []
for (const r of pub) {
  const slug = r.data['SEO:Slug']
  if (typeof slug === 'string' && slug.trim()) {
    withSlug++
    if (!slug.startsWith('-')) withGoodSlug++
    if (slugSamples.length < 5) slugSamples.push(slug)
  }
  const t = r.data['SEO:Title']
  if (typeof t === 'string' && t.trim()) { withSeoTitle++; if (titleSamples.length < 5) titleSamples.push(t.slice(0, 60)) }
  const ai = r.data['ИИ Имя']
  const ie = r.data['Имя ENG']
  const nm = r.data['Name']
  if (ai || ie || nm) withName++
  if (ie) withImyaENG++
  if (t || ai || ie || nm) withTitle++
  if (r.data['Geo'] && r.data['Geo 2']) withGeo++
}
console.log('with valid slug:', withSlug)
console.log('with non-dash slug:', withGoodSlug)
console.log('with seo title:', withSeoTitle)
console.log('with any title:', withTitle)
console.log('with name/ai/eng:', withName)
console.log('with Имя ENG:', withImyaENG)
console.log('with Geo+Geo2:', withGeo)
console.log('slug samples:', slugSamples)
console.log('title samples:', titleSamples)
