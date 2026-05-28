// Sync events (Мероприятия) from Airtable → Supabase Storage manifest.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { downloadAndUpload, ensureBucket as ensureBucketHelper } from './lib-photo-sync.mjs'
import { applyAiFallback } from './_ai-fallback.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const BASE = 'appaKbszqXLnvoVKK'
const TABLE = 'tblpXK8GKeDDA9JJg'
const DEV_TABLE = 'tbl2PLmx3jkzVUNnM'  // local Developer table in events base

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BUCKET = 'events'
const KEY = '_events.json'
const PHOTO_BUCKET = 'event-photos'

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
console.log('▶ fetching events…')
const recs = await fetchAll(BASE, TABLE)
console.log('  events:', recs.length)

await applyAiFallback(recs, 'event')
console.log('▶ fetching local developers…')
const devs = await fetchAll(BASE, DEV_TABLE)
console.log('  devs in events base:', devs.length)

const devById = new Map()
for (const d of devs) {
  devById.set(d.id, { name: fs1(d.fields['Developer']) ?? fs1(d.fields['Name']) })
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
  if (f['Опубликовать'] !== true) { dropped++; continue }
  const slug = fs1(f['SEO:Slug'])
  const title = fs1(f['Название ИИ']) ?? fs1(f['Name']) ?? fs1(f['post name'])
  if (!slug || !title) { dropped++; continue }

  const tempPhoto = urlOfFirstAttachment(f['Opt image'])
              ?? urlOfFirstAttachment(f['Social:image'])
              ?? urlOfFirstAttachment(f['Attachments'])
  const photo = tempPhoto ? await downloadAndUpload(sb, PHOTO_BUCKET, r.id, tempPhoto) : null

  const developerNames = new Set()
  for (const id of (f['Developer'] || [])) {
    const dev = devById.get(id)
    if (dev?.name) developerNames.add(dev.name)
  }
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
    body: fs1(f['Описание ИИ']) ?? fs1(f['Notes']),
    startsAt: fs1(f['Начало']),
    endsAt: fs1(f['Конец']),
    photo,
    format: fs1(f['Формат']),
    locationUrl: fs1(f['Google maps встречи']),
    registerUrl: fs1(f['Ссылка для регистрации']),
    videoUrl: fs1(f['Video']),
    pinned: f['#1'] === true,
    developers,
  })
}

// Sort: pinned first, then upcoming by start date asc, past events at the end.
const now = Date.now()
items.sort((a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  const sa = a.startsAt ? new Date(a.startsAt).getTime() : 0
  const sb_ = b.startsAt ? new Date(b.startsAt).getTime() : 0
  const aFuture = sa >= now, bFuture = sb_ >= now
  if (aFuture !== bFuture) return aFuture ? -1 : 1
  // Both future: ascending. Both past: descending (recent past first).
  return aFuture ? sa - sb_ : sb_ - sa
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
await notifyAgents('events', items.map(it => ({
  sourceId: it.id,
  developerNames: (it.developers ?? []).map(d => d.name).filter(Boolean),
  title: it.title || '(без заголовка)',
  body: it.seoDescription ?? null,
  path: it.slug ? `/ru/meropriyatiya/${it.slug}` : null,
})))
