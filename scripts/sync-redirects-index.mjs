// Build redirect index: airtable_id and slug → new canonical URL.
// Used by middleware to 301 old Wix `/presentation/<slug>/r/<id>` URLs.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = 'feeds'
const KEY = '_redirects-index.json'

function fs1(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1(v.value)
  return null
}

const out = { byId: {}, bySlug: {}, generatedAt: new Date().toISOString() }

console.log('▶ villas…')
const v = await sb.from('raw_villas').select('airtable_id, data').limit(2000)
for (const r of (v.data ?? [])) {
  const slug = fs1(r.data?.['SEO:Slug'])
  if (!slug) continue
  const path = `/ru/villy/o/${slug}`
  out.byId[r.airtable_id] = path
  if (!out.bySlug[slug]) out.bySlug[slug] = path
}
console.log('  villas:', v.data?.length)

console.log('▶ apartments…')
const a = await sb.from('raw_apartments').select('airtable_id, data').limit(2000)
for (const r of (a.data ?? [])) {
  const slug = fs1(r.data?.['SEO:Slug'])
  if (!slug) continue
  const path = `/ru/apartamenty/o/${slug}`
  out.byId[r.airtable_id] = path
  if (!out.bySlug[slug]) out.bySlug[slug] = path
}
console.log('  apartments:', a.data?.length)

console.log('▶ complexes…')
const c = await sb.from('raw_complexes').select('airtable_id, slug').limit(1000)
for (const r of (c.data ?? [])) {
  if (!r.slug) continue
  const path = `/ru/zhilye-kompleksy/o/${r.slug}`
  out.byId[r.airtable_id] = path
  if (!out.bySlug[r.slug]) out.bySlug[r.slug] = path
}
console.log('  complexes:', c.data?.length)

console.log('▶ developers…')
const d = await sb.from('raw_developers').select('airtable_id, data').limit(500)
for (const r of (d.data ?? [])) {
  const slug = fs1(r.data?.['SEO:Slug'])
  if (!slug) continue
  const path = `/ru/zastrojshhiki/${slug}`
  out.byId[r.airtable_id] = path
  if (!out.bySlug[slug]) out.bySlug[slug] = path
}
console.log('  developers:', d.data?.length)

// Storage manifests for news/promo/events/knowledge
async function loadJson(url) {
  const r = await fetch(url)
  if (!r.ok) return null
  return r.json()
}
const SUP = process.env.NEXT_PUBLIC_SUPABASE_URL

for (const [key, path] of [
  ['news/_news.json', '/ru/novosti'],
  ['promo/_promo.json', '/ru/akcii'],
  ['events/_events.json', '/ru/meropriyatiya'],
  ['knowledge/_knowledge.json', '/ru/znaniya'],
]) {
  const j = await loadJson(`${SUP}/storage/v1/object/public/${key}`)
  if (!j?.items) { console.log(' ', key, ': missing'); continue }
  for (const it of j.items) {
    if (!it.slug || !it.id) continue
    const p = `${path}/${it.slug}`
    out.byId[it.id] = p
    if (!out.bySlug[it.slug]) out.bySlug[it.slug] = p
  }
  console.log(`  ${key}: ${j.items.length}`)
}

console.log('total ids:', Object.keys(out.byId).length, 'slugs:', Object.keys(out.bySlug).length)
const body = JSON.stringify(out)
console.log('size:', (body.length / 1024).toFixed(1), 'KB')
const { error } = await sb.storage.from(BUCKET).upload(KEY, body, { contentType: 'application/json', upsert: true })
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${KEY}`)
