import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { cdnRewrite } from './_cdn.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const AIRTABLE_BASE = 'applhWe0pCVRue9QC'
const AIRTABLE_TABLE = 'Комплексы'
const BUCKET = 'complex-photos'
const MANIFEST_KEY = '_manifest.json'
// Sidecar tracking the Airtable attachment-id list per record, joined
// with commas. Same change-detection contract as villas / apartments:
// resume mode skips a record only when its stored att-list still
// matches Airtable, so a photo replace, reorder, or count change
// triggers a re-upload on the next run.
const ATTS_KEY = '_attachments.json'
const MAX_PHOTOS = 10
const RETRIES = 4
const CONCURRENCY = 3

const RESUME = !process.argv.includes('--force')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity
// Targeted re-pull, mirrors the villa/apartment scripts. Pass
// --force-slugs=foo,bar to force-resync any complex whose Project /
// SEO:Title / SEO:Slug contains any of the substrings (case-
// insensitive). Useful after editorial photo updates that the att-id
// baseline missed (see the bootstrap caveat below).
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
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_TABLE)}`)
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

// Cache-bust by tagging the Airtable attachment id as `?v=`. Storage
// upserts to a fixed path; without versioning, browsers serve a stale
// copy after an editor swaps a photo. ?v= flips the URL exactly when
// invalidation is needed.
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
  const photos = rec.fields?.['Opt photos']
  return Array.isArray(photos) && photos.length > 0
})
console.log(`with Opt photos: ${candidates.length}`)

const manifest = await loadExistingManifest()
const atts = await loadExistingAtts()
console.log(`existing manifest entries: ${Object.keys(manifest).length}`)
console.log(`existing atts entries: ${Object.keys(atts).length}`)

// Resume comparison.
//
// Skip a record only when (a) it already has photos in Supabase AND
// (b) the manifest has as many photos as we'd upload for the current
// att-list AND (c) the att-list hasn't changed since last sync.
//
// The length check (b) catches a class of stale manifests the att-id
// baseline alone misses: bootstrap of `_attachments.json` happily
// adopts the current Airtable atts even when the manifest only has
// half the photos — so when an editor adds photos before bootstrap
// runs, the manifest stays half-empty forever. With (b), the resume
// skip refuses until the manifest catches up.
function matchesForceSlugs(rec) {
  if (FORCE_SLUGS.length === 0) return false
  const project = String(rec.fields?.['Project']    ?? '').toLowerCase()
  const slug    = String(rec.fields?.['SEO:Slug']   ?? '').toLowerCase()
  const title   = String(rec.fields?.['SEO:Title']  ?? '').toLowerCase()
  const haystack = `${project} ${slug} ${title}`
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
  // Manifest length should match min(MAX_PHOTOS, current att count).
  // If manifest is shorter — we missed photos at some point, catch up.
  const expected = Math.min(MAX_PHOTOS, photos.length)
  if (manifest[rec.id].length < expected) { afterResume.push(rec); continue }
  const current = attsKeyOf(photos)
  const stored = atts[rec.id]
  if (stored === undefined) { atts[rec.id] = current; continue }
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
let sinceSave = 0
const SAVE_EVERY = 25

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

// One-time normalisation: stamp ?v= onto legacy unversioned URLs
// using the att-lists we already fetched above. Idempotent.
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
