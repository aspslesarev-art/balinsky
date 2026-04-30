// Build lightweight slug→id+district indexes for villa/apt/complex detail pages.
// Avoids the 21MB raw_villas full-row query that hits Postgres statement timeout.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = 'feeds'

function fs1(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1(v.value)
  return null
}

async function paginated(table) {
  const out = []
  let from = 0
  const STEP = 100
  for (let i = 0; i < 50; i++) {
    const t = Date.now()
    const { data, error } = await sb.from(table).select('airtable_id, data').range(from, from + STEP - 1)
    console.log(`  ${table} ${from}..${from + STEP - 1}: ${data?.length ?? 0} rows, ${Date.now() - t}ms${error ? ` err=${error.message}` : ''}`)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < STEP) break
    from += STEP
  }
  return out
}

async function buildVillaIndex() {
  console.log('▶ villas')
  const rows = await paginated('raw_villas')
  const out = []
  for (const r of rows) {
    if (r.data?.['Опубликовать'] !== true) continue
    const slug = fs1(r.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    out.push({
      id: r.airtable_id,
      slug,
      district: fs1(r.data['Location 2']) ?? fs1(r.data['Location']),
    })
  }
  console.log('  published with slug:', out.length)
  return out
}

async function buildApartmentIndex() {
  console.log('▶ apartments')
  const rows = await paginated('raw_apartments')
  const out = []
  for (const r of rows) {
    if (r.data?.['Опубликовать'] !== true) continue
    const slug = fs1(r.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    out.push({
      id: r.airtable_id,
      slug,
      district: fs1(r.data['Location filter']),
    })
  }
  console.log('  published with slug:', out.length)
  return out
}

async function buildComplexIndex() {
  console.log('▶ complexes')
  const { data, error } = await sb.from('raw_complexes').select('airtable_id, slug, data').limit(500)
  if (error) throw error
  const out = []
  for (const r of (data ?? [])) {
    if (!r.slug) continue
    out.push({
      id: r.airtable_id,
      slug: r.slug,
      district: fs1(r.data?.['Location 2']) ?? fs1(r.data?.['Location']),
    })
  }
  console.log('  with slug:', out.length)
  return out
}

const villas = await buildVillaIndex()
const apartments = await buildApartmentIndex()
const complexes = await buildComplexIndex()

for (const [name, items] of [['villas', villas], ['apartments', apartments], ['complexes', complexes]]) {
  const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
  const key = `_${name}-index.json`
  const { error } = await sb.storage.from(BUCKET).upload(key, body, { contentType: 'application/json', upsert: true })
  if (error) throw error
  console.log(`✓ uploaded ${BUCKET}/${key} (${(body.length / 1024).toFixed(1)} KB)`)
}
