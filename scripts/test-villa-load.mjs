import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function firstString(v) {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}

const t0 = Date.now()
const { data, error } = await sb.from('raw_villas').select('airtable_id, data').limit(2000)
console.log(`Query: ${data?.length ?? 0} rows, ${Date.now() - t0}ms, err=`, error?.message)

if (data) {
  let pubCount = 0
  let withSlug = 0
  const allSlugs = []
  for (const r of data) {
    if (r.data?.['Опубликовать'] === true) {
      pubCount++
      const slug = firstString(r.data['SEO:Slug'])
      if (slug && !slug.startsWith('-')) {
        withSlug++
        allSlugs.push(slug)
      }
    }
  }
  console.log('Published:', pubCount, '· with valid slug:', withSlug)
  const target = 'maison-boheme-sanur-108m2-2-bedroom'
  console.log(`"${target}" in slugs:`, allSlugs.includes(target))
  if (!allSlugs.includes(target)) {
    const matches = allSlugs.filter(s => s.includes('maison'))
    console.log('Matches "maison":', matches)
  }
}
