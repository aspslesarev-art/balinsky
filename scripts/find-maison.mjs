import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
function firstString(v) {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}
for (let from = 0; from < 1500; from += 100) {
  const { data } = await sb.from('raw_villas').select('airtable_id, data').range(from, from + 99)
  if (!data?.length) break
  for (const r of data) {
    const slug = firstString(r.data?.['SEO:Slug'])
    if (slug === 'maison-boheme-sanur-108m2-2-bedroom') {
      console.log(r.airtable_id)
    }
  }
}
