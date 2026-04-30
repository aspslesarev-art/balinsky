import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const AIRTABLE_BASE = 'appK9z6iue7wRtEIS'
const AIRTABLE_TABLE = 'tblRD00AhDNrpW3DA'
const BUCKET = 'apartment-photos'
const MANIFEST_KEY = '_manifest.json'
const MAX_PHOTOS = 10
const RETRIES = 4
const CONCURRENCY = 3

const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const PUBLISHED_ONLY = !process.argv.includes('--all')
const RESUME = !process.argv.includes('--force')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets()
  if (error) throw error
  if (buckets.some(b => b.name === BUCKET)) return
  const { error: cErr } = await sb.storage.createBucket(BUCKET, { public: true })
  if (cErr) throw cErr
  console.log(`created bucket ${BUCKET}`)
}

async function fetchAirtableAll() {
  const all = []
  let offset
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    })
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`)
    const j = await r.json()
    all.push(...j.records)
    offset = j.offset
  } while (offset)
  return all
}

function photoUrl(att) {
  return att?.thumbnails?.large?.url ?? att?.url ?? null
}

async function downloadWithRetry(src) {
  let lastErr
  for (let i = 0; i <= RETRIES; i++) {
    try {
      const r = await fetch(src)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return Buffer.from(await r.arrayBuffer())
    } catch (e) {
      lastErr = e
      if (i < RETRIES) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastErr
}

async function uploadWithRetry(path, buf) {
  let lastErr
  for (let i = 0; i <= RETRIES; i++) {
    try {
      const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (error) throw error
      return
    } catch (e) {
      lastErr = e
      if (i < RETRIES) await new Promise(r => setTimeout(r, 800 * (i + 1)))
    }
  }
  throw lastErr
}

async function uploadOne(recId, idx, att) {
  const src = photoUrl(att)
  if (!src) return null
  const buf = await downloadWithRetry(src)
  const path = `${recId}/${idx}.jpg`
  await uploadWithRetry(path, buf)
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function loadExistingManifest() {
  const { data, error } = await sb.storage.from(BUCKET).download(MANIFEST_KEY)
  if (error) return {}
  try {
    const text = await data.text()
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch { return {} }
}

async function saveManifest(manifest) {
  const body = Buffer.from(JSON.stringify(manifest))
  let lastErr
  for (let i = 0; i <= RETRIES; i++) {
    try {
      const { error } = await sb.storage.from(BUCKET).upload(MANIFEST_KEY, body, {
        contentType: 'application/json',
        upsert: true,
      })
      if (error) throw error
      return
    } catch (e) {
      lastErr = e
      if (i < RETRIES) await new Promise(r => setTimeout(r, 800 * (i + 1)))
    }
  }
  throw lastErr
}

await ensureBucket()

const records = await fetchAirtableAll()
console.log(`Airtable records: ${records.length}`)

const candidates = records.filter(rec => {
  if (PUBLISHED_ONLY && rec.fields?.['Опубликовать'] !== true) return false
  const photos = rec.fields?.['Opt photos']
  return Array.isArray(photos) && photos.length > 0
})
console.log(`with photos${PUBLISHED_ONLY ? ' (published)' : ''}: ${candidates.length}`)

const manifest = await loadExistingManifest()
console.log(`existing manifest entries: ${Object.keys(manifest).length}`)

const afterResume = RESUME
  ? candidates.filter(rec => !manifest[rec.id] || manifest[rec.id].length === 0)
  : candidates
const slice = Number.isFinite(LIMIT) ? afterResume.slice(0, LIMIT) : afterResume
console.log(`processing: ${slice.length} (resume=${RESUME})`)

async function processOne(rec) {
  const photos = rec.fields['Opt photos'].slice(0, MAX_PHOTOS)
  const results = await Promise.all(
    photos.map((att, i) =>
      uploadOne(rec.id, i, att).catch(e => {
        console.error(`\n  upload ${rec.id}/${i}: ${e.message}`)
        return null
      })
    )
  )
  return results.filter(u => typeof u === 'string')
}

let done = 0, failed = 0, total_photos = 0
const SAVE_EVERY = 25
let sinceSave = 0

async function worker(queue) {
  while (queue.length) {
    const rec = queue.shift()
    if (!rec) break
    try {
      const urls = await processOne(rec)
      manifest[rec.id] = urls
      total_photos += urls.length
      done++
    } catch (e) {
      failed++
      console.error(`\n${rec.id}: ${e.message}`)
    }
    sinceSave++
    process.stdout.write(`\r${done + failed}/${slice.length}  done=${done} fail=${failed} photos=${total_photos}`)
    if (sinceSave >= SAVE_EVERY) {
      sinceSave = 0
      try { await saveManifest(manifest) } catch (e) { console.error('\nmanifest save:', e.message) }
    }
  }
}

const queue = [...slice]
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))

await saveManifest(manifest)
console.log(`\nfinished: done=${done} failed=${failed} total_photos=${total_photos}`)
console.log(`manifest at: ${sb.storage.from(BUCKET).getPublicUrl(MANIFEST_KEY).data.publicUrl}`)
