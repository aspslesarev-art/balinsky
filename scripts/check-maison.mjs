import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function firstString(v) {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}

const { data: complex } = await sb.from('raw_complexes').select('airtable_id, data, slug').eq('slug', 'maison-boheme').maybeSingle()
console.log('complex:', complex?.slug, '|', firstString(complex?.data?.['Project']))

const villas = []
for (let from = 0; from < 1500; from += 100) {
  const { data } = await sb.from('raw_villas').select('airtable_id, data').range(from, from + 99)
  if (!data || data.length === 0) break
  villas.push(...data)
  if (data.length < 100) break
}
console.log('total villas in DB:', villas.length)
const projectName = firstString(complex?.data?.['Project'])
const lower = projectName?.toLowerCase()
const matches = villas.filter(r => {
  if (r.data?.['Опубликовать'] !== true) return false
  const t = firstString(r.data?.['SEO:Title'])
  return t && t.toLowerCase().includes(lower)
})
console.log(`villas matching "${projectName}":`, matches.length)
matches.slice(0, 5).forEach(r => console.log(' -', firstString(r.data['SEO:Title'])))
