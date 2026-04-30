import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(2000)

function firstString(v) {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}
const pub = data.filter(r => r.data?.['Опубликовать'] === true)

const groups = new Map()
for (const r of pub) {
  const slug = firstString(r.data['SEO:Slug'])
  if (!slug || slug.startsWith('-')) continue
  if (!groups.has(slug)) groups.set(slug, [])
  groups.get(slug).push(r)
}
const dups = [...groups.entries()].filter(([,arr]) => arr.length > 1)

console.log('--- Sample of 5 duplicated slugs (first 3 rows each) ---\n')
for (const [slug, arr] of dups.slice(0, 5)) {
  console.log(`### slug: ${slug} (${arr.length} rows)`)
  for (const r of arr.slice(0, 3)) {
    const d = r.data
    console.log(' id:', r.airtable_id, '| Name:', firstString(d['Name']) ?? firstString(d['ИИ Имя']) ?? '?')
    console.log('   price:', d['price'] ?? d['Цена'], '| Площадь:', d['Площадь'], '| Земля:', d['Земля'], '| Комнаты:', firstString(d['Комнаты']))
    console.log('   Title:', firstString(d['SEO:Title']))
  }
  console.log()
}
