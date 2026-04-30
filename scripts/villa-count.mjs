import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data, error, count } = await sb.from('raw_villas').select('airtable_id, data', { count: 'exact' }).limit(2000)
if (error) { console.error(error); process.exit(1) }
console.log('total rows in raw_villas:', count, ' fetched:', data.length)

const pub = data.filter(r => r.data?.['Опубликовать'] === true)
console.log('published (Опубликовать=true):', pub.length)

const noSlug = pub.filter(r => {
  const v = r.data?.['SEO:Slug']
  const s = typeof v === 'string' ? v.trim() : Array.isArray(v) && typeof v[0]==='string' ? v[0].trim() : null
  return !s || s.startsWith('-')
})
console.log('published WITHOUT valid slug:', noSlug.length)

function firstString(v) {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}
const noTitle = pub.filter(r => {
  const d = r.data ?? {}
  const slug = firstString(d['SEO:Slug'])
  if (!slug || slug.startsWith('-')) return false
  const t =
    firstString(d['SEO:Title']) ??
    firstString(d['ИИ Имя']) ??
    firstString(d['Имя ENG']) ??
    firstString(d['Name'])
  return !t
})
console.log('published with slug but NO title:', noTitle.length)

const slugs = new Map()
for (const r of pub) {
  const s = firstString(r.data?.['SEO:Slug'])
  if (!s || s.startsWith('-')) continue
  slugs.set(s, (slugs.get(s) ?? 0) + 1)
}
const dups = [...slugs.entries()].filter(([,c]) => c > 1)
console.log('duplicate slugs (count>1):', dups.length, 'extra rows lost to dedupe:', dups.reduce((a,[,c])=>a+c-1,0))
console.log('sample dups:', dups.slice(0,10))

// Count what passes ALL filters
let ok = 0
for (const r of pub) {
  const d = r.data ?? {}
  const slug = firstString(d['SEO:Slug'])
  if (!slug || slug.startsWith('-')) continue
  const t = firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя']) ?? firstString(d['Имя ENG']) ?? firstString(d['Name'])
  if (!t) continue
  ok++
}
console.log('passes slug+title gate (before dedupe):', ok)
