// Build lightweight slug→id+district indexes for villa/apt/complex detail pages.
// Avoids the 21MB raw_villas full-row query that hits Postgres statement timeout.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = 'feeds'

// Slug normalisation, mirrored from lib/slug-normalize.ts. Editors paste
// look-alike characters (cyrillic 'с' for latin 'c', parens, mixed case)
// into Airtable's SEO:Slug, which then leak into URLs and crash GSC's
// crawl path. Normalising here means the index — and therefore every
// outbound link in the catalog — uses the canonical form. The
// alias map below preserves the original ("dirty") slug pointing at
// the same id, so old GSC-cached URLs 301 to the canonical instead
// of 404'ing.
const CYRILLIC_LATIN_LOOKALIKES = {
  'а':'a','А':'a','е':'e','Е':'e','о':'o','О':'o','р':'p','Р':'p',
  'с':'c','С':'c','у':'y','У':'y','х':'x','Х':'x','к':'k','К':'k',
  'м':'m','М':'m','т':'t','Т':'t','в':'b','В':'b','н':'h','Н':'h',
  'і':'i','І':'i','ё':'e','Ё':'e',
}
const RU_TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function normalizeSlug(raw) {
  if (!raw) return ''
  let s = ''
  for (const ch of raw) s += CYRILLIC_LATIN_LOOKALIKES[ch] ?? ch
  s = s.toLowerCase()
  let t = ''
  for (const ch of s) t += RU_TRANSLIT[ch] ?? ch
  return t.replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

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

// Build the published index: each entry is keyed by the canonical
// (normalised) slug and points to its id + district. We also collect
// any "alias" slugs — the dirty originals that GSC has indexed —
// pointing to the same id, so the detail page can 301 from old to new.
function buildEntry(rawSlug, id, district) {
  const canonical = normalizeSlug(rawSlug)
  if (!canonical || canonical.startsWith('-')) return null
  const aliases = []
  if (rawSlug && rawSlug !== canonical) aliases.push(rawSlug)
  return { id, slug: canonical, district, ...(aliases.length ? { aliases } : {}) }
}

async function buildVillaIndex() {
  console.log('▶ villas')
  const rows = await paginated('raw_villas')
  const out = []
  let dirtied = 0
  for (const r of rows) {
    if (r.data?.['Опубликовать'] !== true) continue
    const slug = fs1(r.data['SEO:Slug'])
    if (!slug) continue
    const e = buildEntry(slug, r.airtable_id, fs1(r.data['Location 2']) ?? fs1(r.data['Location']))
    if (!e) continue
    if (e.aliases) dirtied++
    out.push(e)
  }
  console.log(`  published with slug: ${out.length} (normalised ${dirtied})`)
  return out
}

async function buildApartmentIndex() {
  console.log('▶ apartments')
  const rows = await paginated('raw_apartments')
  const out = []
  let dirtied = 0
  for (const r of rows) {
    if (r.data?.['Опубликовать'] !== true) continue
    const slug = fs1(r.data['SEO:Slug'])
    if (!slug) continue
    const e = buildEntry(slug, r.airtable_id, fs1(r.data['Location filter']))
    if (!e) continue
    if (e.aliases) dirtied++
    out.push(e)
  }
  console.log(`  published with slug: ${out.length} (normalised ${dirtied})`)
  return out
}

async function buildComplexIndex() {
  console.log('▶ complexes')
  const { data, error } = await sb.from('raw_complexes').select('airtable_id, slug, data').limit(500)
  if (error) throw error
  const out = []
  let dirtied = 0
  for (const r of (data ?? [])) {
    if (!r.slug) continue
    const e = buildEntry(r.slug, r.airtable_id, fs1(r.data?.['Location 2']) ?? fs1(r.data?.['Location']))
    if (!e) continue
    if (e.aliases) dirtied++
    out.push(e)
  }
  console.log(`  with slug: ${out.length} (normalised ${dirtied})`)
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
