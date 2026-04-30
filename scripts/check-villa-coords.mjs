import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(1000)

let withCoords = 0
let withoutCoords = 0
const samples = []
for (const r of data) {
  const d = r.data
  if (d?.['Опубликовать'] !== true) continue
  const lat = d['Geo']
  const lng = d['Geo 2']
  const slug = (d['SEO:Slug']?.value ?? d['SEO:Slug']) || (Array.isArray(d['SEO:Slug']) ? d['SEO:Slug'][0] : null)
  if (lat && lng) { withCoords++; if (samples.length < 3) samples.push({ slug, lat, lng }) }
  else withoutCoords++
}
console.log('Published villas with coords:', withCoords, 'without:', withoutCoords)
console.log('Samples:', JSON.stringify(samples, null, 2))

// Check the specific villas
for (const slugTry of ['rachida-pandawa-450m2-6-bedroom', 'the-bank-by-oxo-pererenan-665m2-6-bedroom']) {
  const v = data.find(r => {
    const s = r.data['SEO:Slug']
    const got = s?.value ?? (Array.isArray(s) ? s[0] : s)
    return got === slugTry
  })
  console.log('\n', slugTry, ':')
  if (v) {
    console.log('  Geo:', JSON.stringify(v.data['Geo']))
    console.log('  Geo 2:', JSON.stringify(v.data['Geo 2']))
    console.log('  Опубликовать:', v.data['Опубликовать'])
  } else {
    console.log('  NOT FOUND')
  }
}
