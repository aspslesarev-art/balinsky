// Sync monthly rentals (Помесячная аренда) from Airtable → Supabase Storage manifest.
//
// Photos are downloaded into Supabase Storage on first sync and the resulting
// public URLs are reused on subsequent runs via a local attachmentId → url
// cache. Airtable attachment URLs are ephemeral (~hours), so the manifest must
// not contain them directly — that broke /ru/arenda when the GitHub Actions
// cron skipped a few runs.
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const BASE = 'appyFZnbPPGh29e1h'
const TABLE = 'tblv9FD65h8SQi8M0'

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SUPABASE_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const BUCKET = 'rental'
const KEY = '_rental.json'
const PHOTO_BUCKET = 'rental-photos'
const PHOTO_CACHE_PATH = path.resolve('scripts/_rental-photos-cache.json')
const MAX_PHOTOS_PER_LISTING = 8
const PHOTO_CONCURRENCY = 8

const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function slugify(s) {
  if (!s) return ''
  let out = ''
  for (const ch of s.toLowerCase()) out += TRANSLIT[ch] ?? ch
  return out
    .replace(/[^a-z0-9\-_\s]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'arenda'
}

async function ensureBucket(name) {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === name)) {
    const { error } = await sb.storage.createBucket(name, { public: true })
    if (error) throw error
    console.log('created bucket', name)
  }
}

function loadPhotoCache() {
  try { return JSON.parse(fs.readFileSync(PHOTO_CACHE_PATH, 'utf8')) } catch { return {} }
}
function savePhotoCache(cache) { fs.writeFileSync(PHOTO_CACHE_PATH, JSON.stringify(cache, null, 0)) }

const photoCache = loadPhotoCache()
let photoCacheDirty = false

async function uploadPhoto(recordId, attachment) {
  if (!attachment?.id || !attachment?.url) return null
  // Cached: same attachmentId already in Storage. Skip download entirely.
  if (photoCache[attachment.id]) return photoCache[attachment.id]
  try {
    const r = await fetch(attachment.url)
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    const ct = r.headers.get('content-type') || 'image/jpeg'
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    // Hash-based key keeps things idempotent across runs even if cache is wiped.
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10)
    const key = `${recordId}/${hash}.${ext}`
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(key, buf, {
      contentType: ct, upsert: true,
    })
    if (error) return null
    const url = `${SUPABASE_BASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${key}`
    photoCache[attachment.id] = url
    photoCacheDirty = true
    return url
  } catch {
    return null
  }
}

// Run uploads in bounded concurrency to keep both Airtable and Supabase happy.
async function uploadPhotosBounded(recordId, attachments) {
  const results = new Array(attachments.length)
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= attachments.length) return
      results[i] = await uploadPhoto(recordId, attachments[i])
    }
  }
  await Promise.all(Array.from({ length: PHOTO_CONCURRENCY }, worker))
  return results.filter(Boolean)
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
function num(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null }
  return null
}
function attachmentForUpload(a) {
  // Use the medium thumbnail when available — keeps Storage size sane while
  // still giving 640px-ish wide images (good enough for catalog cards).
  const url = a?.thumbnails?.large?.url ?? a?.url
  return url ? { id: a.id, url } : null
}

await ensureBucket(BUCKET)
await ensureBucket(PHOTO_BUCKET)
console.log('▶ fetching rentals…')
const recs = await fetchAll(BASE, TABLE)
console.log('  records:', recs.length, '| photo cache hits start:', Object.keys(photoCache).length)

const items = []
const seenSlugs = new Map()
let dropped = 0
let processed = 0

for (const r of recs) {
  const f = r.fields || {}
  const title = fs1(f['Короткое название']) ?? fs1(f['Name'])
  const priceMonthUsd = num(f['Цена в месяц'])
  const photoAtts = Array.isArray(f['Opt photos']) ? f['Opt photos'] : []
  if (!title || priceMonthUsd == null || photoAtts.length === 0) { dropped++; continue }

  let slug = slugify(title)
  const n = (seenSlugs.get(slug) ?? 0) + 1
  seenSlugs.set(slug, n)
  if (n > 1) slug = `${slug}-${n}`

  const candidateAtts = photoAtts
    .slice(0, MAX_PHOTOS_PER_LISTING)
    .map(attachmentForUpload)
    .filter(Boolean)
  const photos = await uploadPhotosBounded(r.id, candidateAtts)
  if (photos.length === 0) { dropped++; continue }

  processed++
  if (processed % 50 === 0) {
    if (photoCacheDirty) { savePhotoCache(photoCache); photoCacheDirty = false }
    console.log(`  … ${processed} listings, ${Object.keys(photoCache).length} photos cached`)
  }

  items.push({
    id: r.id,
    slug,
    title,
    type: fs1(f['Тип']),
    bedrooms: num(f['Спальни']),
    location: fs1(f['Location']),
    priceMonthUsd,
    priceSegment: fs1(f['Ценовой сегмент']),
    notes: fs1(f['Notes']),
    telegram: fs1(f['Контакт Телеграм']),
    photos,
    createdTime: r.createdTime ?? null,
    updatedAt: fs1(f['Последнее обновление']),
  })
}

// Sort: newest by createdTime first
items.sort((a, b) => {
  const ta = a.createdTime ? new Date(a.createdTime).getTime() : 0
  const tb = b.createdTime ? new Date(b.createdTime).getTime() : 0
  return tb - ta
})

console.log('▶ kept:', items.length, 'dropped:', dropped)
const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/json', upsert: true,
})
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${KEY}`)

if (photoCacheDirty) savePhotoCache(photoCache)
console.log(`  photo cache size: ${Object.keys(photoCache).length}`)
