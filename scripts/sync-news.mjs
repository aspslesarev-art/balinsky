// Sync news from Airtable → Supabase Storage manifest.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { downloadAndUpload, ensureBucket as ensureBucketHelper } from './lib-photo-sync.mjs'
import { applyAiFallback } from './_ai-fallback.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const NEWS_BASE = 'appjkxFu5bu0Zi08J'
const NEWS_TABLE = 'tblwXXOBuDaG4yD4F'
const NEWS_COMPLEX_TABLE = 'tblIZWnWMxrcsKvnv'  // "Компленксы" в этой базе
const NEWS_DEV_TABLE = 'tbleYNDKkaqfwfNYZ'      // "Застройщики" в этой базе

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BUCKET = 'news'
const MANIFEST_KEY = '_news.json'
const PHOTO_BUCKET = 'news-photos'

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

console.log('▶ fetching news…')
const newsRecs = await fetchAll(NEWS_BASE, NEWS_TABLE)
console.log('  news records:', newsRecs.length)

await applyAiFallback(newsRecs, 'news article')

console.log('▶ fetching complexes (in news base)…')
const complexRecs = await fetchAll(NEWS_BASE, NEWS_COMPLEX_TABLE)
console.log('  complexes:', complexRecs.length)

console.log('▶ fetching developers (in news base)…')
const devRecs = await fetchAll(NEWS_BASE, NEWS_DEV_TABLE)
console.log('  developers:', devRecs.length)

// Maps for resolving links
const complexById = new Map()
for (const c of complexRecs) {
  complexById.set(c.id, {
    name: fs1(c.fields['Developer']) ?? fs1(c.fields['Name']) ?? fs1(c.fields['ИИ Имя']),
  })
}
const devById = new Map()
for (const d of devRecs) {
  devById.set(d.id, {
    name: fs1(d.fields['Developer']) ?? fs1(d.fields['Name']) ?? fs1(d.fields['ИИ Имя']),
    slug: fs1(d.fields['SEO:Slug']),
  })
}

// Resolve developer slugs from production raw_developers (links to /ru/zastrojshhiki/<slug>)
const { data: prodDevs } = await sb.from('raw_developers').select('data').limit(500)
const mainDevByNameLower = new Map()
for (const d of (prodDevs ?? [])) {
  const nm = (d.data?.['Developer'] || '').toString().trim().toLowerCase()
  const slug = d.data?.['SEO:Slug'] || null
  if (nm && slug) mainDevByNameLower.set(nm, { name: d.data['Developer'], slug })
}
console.log('  main developers loaded:', mainDevByNameLower.size)

const items = []
let dropped = 0
for (const r of newsRecs) {
  const f = r.fields || {}
  const slug = fs1(f['SEO:Slug'])
  const title = fs1(f['ИИ Заголовок']) ?? fs1(f['SEO:Title']) ?? fs1(f['Name'])
  const seoDesc = fs1(f['SEO:Description'])
  const text = fs1(f['Notes'])
  const date = fs1(f['Date'])
  if (!slug || !title) { dropped++; continue }

  const tempPhoto = urlOfFirstAttachment(f['Social:Image']) ?? urlOfFirstAttachment(f['Attachments'])
  const photo = tempPhoto ? await downloadAndUpload(sb, PHOTO_BUCKET, r.id, tempPhoto) : null

  // Тема → developer (this is the primary link). Резолвим через news-base devs table, потом через main devs manifest для slug.
  const developerNames = new Set()
  for (const id of (f['Тема'] || [])) {
    const dev = devById.get(id)
    if (dev?.name) developerNames.add(dev.name)
  }
  const developers = []
  for (const nm of developerNames) {
    const main = mainDevByNameLower.get(nm.toLowerCase())
    developers.push({ name: nm, slug: main?.slug ?? null })
  }

  // Комплекс — для контекста, имена комплексов
  const complexNames = (f['Комплекс'] || []).map(id => complexById.get(id)?.name).filter(Boolean)

  items.push({
    id: r.id,
    slug,
    title,
    seoDescription: seoDesc,
    body: text,
    date,
    photo,
    externalUrl: fs1(f['ссылка']),
    videoUrl: fs1(f['видео']),
    pinned: f['На главной (бесплатно)'] === true,
    complexNames,
    developers,
  })
}

// Sort: pinned first, then by date desc
items.sort((a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  const da = a.date ? new Date(a.date).getTime() : 0
  const db = b.date ? new Date(b.date).getTime() : 0
  return db - da
})

console.log('▶ kept:', items.length, 'dropped:', dropped)

const payload = {
  generatedAt: new Date().toISOString(),
  count: items.length,
  items,
}
const body = JSON.stringify(payload)
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(MANIFEST_KEY, body, {
  contentType: 'application/json',
  upsert: true,
})
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${MANIFEST_KEY}`)
