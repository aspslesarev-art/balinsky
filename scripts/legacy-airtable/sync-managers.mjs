import './_retired.mjs'
// Sync managers (Менеджеры застройщиков) from Airtable → Supabase Storage manifest.
// Photos are downloaded into Storage on first run and reused via a local
// attachmentId → url cache, same pattern as sync-rental.mjs. Airtable
// attachment URLs are ephemeral (~hours), so we can't ship them in the
// manifest directly.
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const BASE = 'appg0DOPvgiHj8f4x'
const MANAGERS_TABLE = 'tblwDatCp7hsx7UGb'
const DEV_TABLE = 'tblpKy7gSF4Rpc7Cb' // local Developer table in managers base

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SUPABASE_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const BUCKET = 'managers'
const KEY = '_managers.json'
const PHOTO_BUCKET = 'manager-photos'
const PHOTO_CACHE_PATH = path.resolve('scripts/_manager-photos-cache.json')

async function ensureBucket(name, { public: pub = true } = {}) {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === name)) {
    const { error } = await sb.storage.createBucket(name, { public: pub })
    if (error) throw error
    console.log('created bucket', name)
  }
}

function loadPhotoCache() {
  try { return JSON.parse(fs.readFileSync(PHOTO_CACHE_PATH, 'utf8')) } catch { return {} }
}
function savePhotoCache(cache) { fs.writeFileSync(PHOTO_CACHE_PATH, JSON.stringify(cache, null, 0)) }
const photoCache = loadPhotoCache()

async function uploadPhoto(recordId, attachment) {
  if (!attachment?.id || !attachment?.url) return null
  // Cache key is `<attachmentId>:<size>` — Airtable can replace the
  // file behind the same attachment.id when an editor uploads a new
  // one, but the file size changes, which we can read off the
  // download response. Pure attachment.id caching used to serve the
  // first uploaded URL forever.
  try {
    const r = await fetch(attachment.url)
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    const cacheKey = `${attachment.id}:${buf.length}`
    if (photoCache[cacheKey]) return photoCache[cacheKey]
    const ct = r.headers.get('content-type') || 'image/jpeg'
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10)
    const key = `${recordId}/${hash}.${ext}`
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(key, buf, {
      contentType: ct, upsert: true,
    })
    if (error) return null
    const url = `${SUPABASE_BASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${key}`
    photoCache[cacheKey] = url
    // Drop the old plain-id key for this attachment so the cache
    // doesn't keep both indefinitely.
    delete photoCache[attachment.id]
    return url
  } catch {
    return null
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
function attachmentForUpload(att) {
  if (!Array.isArray(att) || att.length === 0) return null
  const a = att[0]
  const url = a?.thumbnails?.large?.url ?? a?.url
  return url ? { id: a.id, url } : null
}

await ensureBucket(BUCKET, { public: true })
await ensureBucket(PHOTO_BUCKET, { public: true })
console.log('▶ fetching managers + local dev table…')
const [managers, localDevs] = await Promise.all([
  fetchAll(BASE, MANAGERS_TABLE),
  fetchAll(BASE, DEV_TABLE),
])
console.log('  managers:', managers.length, 'local devs:', localDevs.length)

// Build map: localDevRecordId -> developerName
const localDevById = new Map()
for (const d of localDevs) {
  const name = fs1(d.fields['Developer']) ?? fs1(d.fields['Name'])
  if (name) localDevById.set(d.id, name)
}

// Pull main-base developers to map name -> slug (case-insensitive on name)
const { data: prodDevs } = await sb.from('raw_developers').select('data').limit(500)
const slugByName = new Map()
for (const d of (prodDevs ?? [])) {
  const nm = (d.data?.['Developer'] || '').toString().trim().toLowerCase()
  const slug = d.data?.['SEO:Slug']
  if (nm && slug) slugByName.set(nm, slug)
}
console.log('  prod developers:', slugByName.size)

const items = []
let dropped = 0
let uploadedPhotos = 0
for (const r of managers) {
  const f = r.fields || {}
  // Hidden by editor — they don't ship to the manifest at all, so
  // /ru/zastrojshhiki, villa / complex / apartment detail pages and the
  // generic ManagerCard never see them. Re-enabling is a one-click in
  // Airtable + next sync run.
  if (f['Скрыть'] === true) { dropped++; continue }
  const name = fs1(f['Name'])
  if (!name) { dropped++; continue }

  // Resolve developer slug via manager's linked record -> developer name -> main slug
  const linked = Array.isArray(f['Застройщик']) ? f['Застройщик'] : []
  const slugs = []
  const developerNames = []
  for (const id of linked) {
    const devName = localDevById.get(id)
    if (!devName) continue
    developerNames.push(devName)
    const slug = slugByName.get(devName.toLowerCase())
    if (slug) slugs.push(slug)
  }
  if (slugs.length === 0) { dropped++; continue } // manager not linked to any published developer

  const languages = Array.isArray(f['Языки']) ? f['Языки'] : []
  // EN fields land in Airtable as `{ state, value, isStale }` AI-generated
  // wrappers; fs1 unwraps them. Languages EN comes back as a comma- or
  // slash-separated string ("Russian, English") — split into a clean array.
  const nameEn = fs1(f['Name En'])
  const languagesEnRaw = fs1(f['Языки En'])
  const languagesEn = languagesEnRaw
    ? languagesEnRaw.split(/[,;/]+/).map(s => s.trim()).filter(Boolean)
    : []
  const rating = typeof f['Рейтинг'] === 'number' ? f['Рейтинг'] : null

  // Photo → Supabase Storage with cache fallback to Airtable URL on upload error.
  const photoAtt = attachmentForUpload(f['Фото'])
  let photoUrl = null
  if (photoAtt) {
    const stored = await uploadPhoto(r.id, photoAtt)
    if (stored) { photoUrl = stored; uploadedPhotos++ }
    else photoUrl = photoAtt.url
  }

  items.push({
    id: r.id,
    name,
    nameEn,
    photo: photoUrl,
    telegram: fs1(f['Telegram']),
    telegramHandle: fs1(f['TG Name']),
    whatsapp: fs1(f['WhatsApp']),
    botRequest: fs1(f['Заявка в бота']),
    rating,
    languages,
    languagesEn,
    developerSlugs: slugs,
    developerNames,
    regalia: fs1(f['Регалии']),
  })
}

savePhotoCache(photoCache)
console.log('▶ kept:', items.length, 'dropped:', dropped, '| photos in storage:', uploadedPhotos, '| cache size:', Object.keys(photoCache).length)
const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/json', upsert: true,
})
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${KEY}`)
