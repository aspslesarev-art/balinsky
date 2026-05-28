// Sync promotions (Акции) from Airtable → Supabase Storage manifest.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { downloadAndUpload, ensureBucket as ensureBucketHelper } from './lib-photo-sync.mjs'
import { applyAiFallback } from './_ai-fallback.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const BASE = 'apphPlibFL8GKhQKS'
const TABLE = 'tblE5G3Yg1pE5J5wo'
const COMPLEX_TABLE = 'tblGCtu4vaYfHDDZ2'

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BUCKET = 'promo'
const KEY = '_promo.json'
const PHOTO_BUCKET = 'promo-photos'

async function ensureBucket() {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true })
    if (error) throw error
    console.log('created bucket', BUCKET)
  }
}
async function fetchAll(baseId, tableId) {
  const out = []
  let offset
  for (let i = 0; i < 200; i++) {
    const u = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`)
    u.searchParams.set('pageSize', '100')
    if (offset) u.searchParams.set('offset', offset)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
    const j = await r.json()
    out.push(...j.records)
    if (!j.offset) break
    offset = j.offset
  }
  return out
}
function fs1(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1(v.value)
  return null
}
function urlOfFirstAttachment(att) {
  if (!Array.isArray(att) || att.length === 0) return null
  const a = att[0]
  return a.thumbnails?.large?.url ?? a.url ?? null
}

await ensureBucket()
await ensureBucketHelper(sb, PHOTO_BUCKET)
console.log('▶ fetching promotions…')
const recs = await fetchAll(BASE, TABLE)
console.log('  promo records:', recs.length)

await applyAiFallback(recs, 'promo offer')
console.log('▶ fetching complexes…')
const complexes = await fetchAll(BASE, COMPLEX_TABLE)
console.log('  complexes:', complexes.length)

const complexById = new Map()
for (const c of complexes) {
  complexById.set(c.id, {
    name: fs1(c.fields['Project']) ?? fs1(c.fields['Name']),
    developer: fs1(c.fields['Developer']),
  })
}

const { data: prodDevs } = await sb.from('raw_developers').select('data').limit(500)
const mainDevByName = new Map()
for (const d of (prodDevs ?? [])) {
  const nm = (d.data?.['Developer'] || '').toString().trim().toLowerCase()
  const slug = d.data?.['SEO:Slug'] || null
  if (nm && slug) mainDevByName.set(nm, { name: d.data['Developer'], slug })
}
console.log('  prod developers:', mainDevByName.size)

const items = []
let dropped = 0
for (const r of recs) {
  const f = r.fields || {}
  const slug = fs1(f['SEO:Slug'])
  const title = fs1(f['Заголовок ИИ']) ?? fs1(f['SEO:Title']) ?? fs1(f['Name'])
  if (!slug || !title) { dropped++; continue }

  const tempPhoto = urlOfFirstAttachment(f['Opt Image'])
              ?? urlOfFirstAttachment(f['Social:image'])
              ?? urlOfFirstAttachment(f['Attachments'])
  const photo = tempPhoto ? await downloadAndUpload(sb, PHOTO_BUCKET, r.id, tempPhoto) : null

  const complexLinks = (f['Комплекс'] || []).map(id => complexById.get(id)).filter(Boolean)
  const complexNames = complexLinks.map(c => c.name).filter(Boolean)
  const developerNames = new Set(complexLinks.map(c => c.developer).filter(Boolean))

  const developers = []
  for (const nm of developerNames) {
    const main = mainDevByName.get(nm.toLowerCase())
    developers.push({ name: nm, slug: main?.slug ?? null })
  }

  items.push({
    id: r.id,
    slug,
    title,
    seoDescription: fs1(f['SEO:Description']),
    body: fs1(f['Notes']),
    expiresAt: fs1(f['Срок акции']),
    photo,
    externalUrl: fs1(f['ссылка']),
    pinned: f['Приоритет'] === true,
    top10: f['ТОП-10'] === true,
    complexNames,
    developers,
  })
}

// Sort: pinned/top10 first, then by expiresAt asc (ближайшие к окончанию выше)
const now = Date.now()
items.sort((a, b) => {
  const score = x => (x.pinned ? 4 : 0) + (x.top10 ? 2 : 0)
  const sa = score(a), sb = score(b)
  if (sa !== sb) return sb - sa
  // Active (expiresAt in future or null) before expired
  const ea = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity
  const eb = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity
  const aActive = ea >= now, bActive = eb >= now
  if (aActive !== bActive) return aActive ? -1 : 1
  return ea - eb
})

console.log('▶ kept:', items.length, 'dropped:', dropped)
const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/json', upsert: true,
})
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${KEY}`)

const { notifyAgents } = await import('./_agent-notify.mjs')
await notifyAgents('promo', items.map(it => ({
  sourceId: it.id,
  developerNames: (it.developers ?? []).map(d => d.name).filter(Boolean),
  title: it.title || '(без заголовка)',
  body: it.seoDescription ?? null,
  path: it.slug ? `/ru/akcii/${it.slug}` : null,
})))
