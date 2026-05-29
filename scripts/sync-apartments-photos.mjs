import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { cdnRewrite } from './_cdn.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const AIRTABLE_BASE = 'appK9z6iue7wRtEIS'
const AIRTABLE_TABLE = 'tblRD00AhDNrpW3DA'
const BUCKET = 'apartment-photos'
const MANIFEST_KEY = '_manifest.json'
// Side file holding the Airtable attachment-ID list per record ("att…"),
// joined as a comma-separated string. Used as a change-detection key:
// resume mode skips a record only if the stored key matches the current
// Airtable atts. So a photo replace, reorder, or count change in
// Airtable triggers a re-upload on the next run.
const ATTS_KEY = '_attachments.json'
const MAX_PHOTOS = 10
const RETRIES = 4
const CONCURRENCY = 3

const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const PUBLISHED_ONLY = !process.argv.includes('--all')
const RESUME = !process.argv.includes('--force')
// One-off targeted re-pull. Pass --force-slugs=foo,bar (comma-separated)
// to force-resync just records whose SEO:Slug *contains* any of the
// substrings. Used to recover from Airtable edits made before the
// att-id baseline existed (e.g. updating an entire complex's photos).
const forceSlugsArg = process.argv.find(a => a.startsWith('--force-slugs='))?.split('=')[1]
const FORCE_SLUGS = (forceSlugsArg ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

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

// Cache-bust URLs by tagging the Airtable attachment id as `?v=`.
// Storage upserts to a fixed path; without a versioned URL, browsers
// keep showing the stale copy after an editor replaces or reorders a
// photo. ?v= flips the URL exactly when invalidation is needed.
function attVersion(att) {
  const id = att?.id ?? ''
  return id.startsWith('att') ? id.slice(3) : id
}

async function uploadOne(recId, idx, att) {
  const src = photoUrl(att)
  if (!src) return null
  const buf = await downloadWithRetry(src)
  const path = `${recId}/${idx}.jpg`
  await uploadWithRetry(path, buf)
  const baseUrl = cdnRewrite(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
  const v = attVersion(att)
  return v ? `${baseUrl}?v=${v}` : baseUrl
}

async function loadJsonFile(key) {
  const { data, error } = await sb.storage.from(BUCKET).download(key)
  if (error) return {}
  try {
    const text = await data.text()
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch { return {} }
}

async function saveJsonFile(key, payload) {
  const body = Buffer.from(JSON.stringify(payload))
  let lastErr
  for (let i = 0; i <= RETRIES; i++) {
    try {
      const { error } = await sb.storage.from(BUCKET).upload(key, body, {
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

const loadExistingManifest = () => loadJsonFile(MANIFEST_KEY)
const saveManifest = m => saveJsonFile(MANIFEST_KEY, m)
const loadExistingAtts = () => loadJsonFile(ATTS_KEY)
const saveAtts = a => saveJsonFile(ATTS_KEY, a)

function attsKeyOf(photos) {
  return (Array.isArray(photos) ? photos : []).map(p => p?.id).filter(Boolean).join(',')
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
const atts = await loadExistingAtts()
console.log(`existing manifest entries: ${Object.keys(manifest).length}`)
console.log(`existing atts entries: ${Object.keys(atts).length}`)

// Resume mode skips a record only when (a) we already have photos for
// it AND (b) the Airtable attachment list hasn't changed since last
// sync. A photo swap in Airtable changes the att-id list → record gets
// re-pulled. Records with no atts entry yet (legacy data) get re-pulled
// too, so the first run of this version refreshes everyone — that's a
// one-time cost.
function matchesForceSlugs(rec) {
  if (FORCE_SLUGS.length === 0) return false
  // Match against both SEO:Slug (per-apartment identifier) AND
  // SEO:Title (which usually carries the complex name). One token,
  // broader coverage — see sync-villa-photos.mjs for the rationale.
  const slug = String(rec.fields?.['SEO:Slug'] ?? '').toLowerCase()
  const title = String(rec.fields?.['SEO:Title'] ?? '').toLowerCase()
  const haystack = `${slug} ${title}`
  if (!haystack.trim()) return false
  return FORCE_SLUGS.some(s => haystack.includes(s))
}

const afterResume = []
for (const rec of candidates) {
  if (matchesForceSlugs(rec)) { afterResume.push(rec); continue }
  if (!RESUME) { afterResume.push(rec); continue }
  const photos = rec.fields['Opt photos']
  const haveUrls = manifest[rec.id] && manifest[rec.id].length > 0
  if (!haveUrls) { afterResume.push(rec); continue }
  // Catch-up: if the manifest has fewer photos than the current
  // att-list expects (capped at MAX_PHOTOS), force a re-pull. The
  // att-id baseline alone misses cases where bootstrap adopted the
  // current atts before the manifest was complete.
  const expected = Math.min(MAX_PHOTOS, photos.length)
  if (manifest[rec.id].length < expected) { afterResume.push(rec); continue }
  const current = attsKeyOf(photos)
  const stored = atts[rec.id]
  if (stored === undefined) {
    // Bootstrap: adopt the current att list as the baseline. We trust
    // the existing manifest until proven otherwise — no re-download.
    atts[rec.id] = current
    continue
  }
  if (stored !== current) afterResume.push(rec)
}
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
      atts[rec.id] = attsKeyOf(rec.fields['Opt photos'])
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
      try {
        await saveManifest(manifest)
        await saveAtts(atts)
      } catch (e) { console.error('\nmanifest save:', e.message) }
    }
  }
}

const queue = [...slice]
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))

// Idempotent normalisation: stamp ?v= onto legacy unversioned URLs
// from previous sync runs. Uses Airtable atts already in scope, no
// extra downloads.
const attsByRec = new Map()
for (const rec of candidates) attsByRec.set(rec.id, rec.fields['Opt photos'])
let normalised = 0
for (const [recId, urls] of Object.entries(manifest)) {
  if (!Array.isArray(urls)) continue
  const photos = attsByRec.get(recId)
  if (!Array.isArray(photos) || photos.length === 0) continue
  let changed = false
  const next = urls.map((u, i) => {
    if (typeof u !== 'string') return u
    // Same pass also rewrites Supabase hostnames to the CDN when enabled.
    const rewritten = cdnRewrite(u)
    if (rewritten !== u) changed = true
    if (rewritten.includes('?v=')) return rewritten
    const v = attVersion(photos[i])
    if (!v) return rewritten
    changed = true
    return `${rewritten}?v=${v}`
  })
  if (changed) { manifest[recId] = next; normalised++ }
}
if (normalised) console.log(`\nnormalised ${normalised} manifest entries to ?v=…`)

await saveManifest(manifest)
await saveAtts(atts)
console.log(`\nfinished: done=${done} failed=${failed} total_photos=${total_photos}`)
console.log(`manifest at: ${sb.storage.from(BUCKET).getPublicUrl(MANIFEST_KEY).data.publicUrl}`)
