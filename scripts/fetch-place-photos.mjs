// Buy each tourist place's lead photo ONCE and park it in our own Storage.
//
// Google bills Place Photo media per request, so /api/place-photo costs money
// on every edge cache miss, forever. This pulls the photo a single time at web
// resolution (Google does the downscale server-side — no sharp needed), uploads
// it to the `places` bucket and records the permanent URL on the place. After
// that the site serves a plain CDN asset and Google is never called again.
//
// Priority: places that already appear in a listing's "nearest premium" list
// (`place_photo_queue.in_top`) — those are the ones a visitor actually sees.
//
// Usage:
//   node scripts/fetch-place-photos.mjs --dry            # show the queue, buy nothing
//   node scripts/fetch-place-photos.mjs --limit=50       # small paid batch
//   node scripts/fetch-place-photos.mjs --cap=25         # full run, hard stop at $25
//
// Cost: $0.007 per photo (Place Photo SKU, $7/1000). Re-running is safe and
// cheap — the queue only holds places whose photo_url is still null.
import fs from 'node:fs'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

// ---- env ----
const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const GMAPS_KEY = process.env.GOOGLE_PLACES_KEY
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_KEY
if (!GMAPS_KEY) { console.error('Missing GOOGLE_PLACES_KEY in .env.local'); process.exit(1) }
if (!SB_URL || !SB_KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1) }

// ---- args ----
const ARGS = process.argv.slice(2)
const DRY = ARGS.includes('--dry')
const LIMIT = Number((ARGS.find(a => a.startsWith('--limit=')) || '--limit=0').split('=')[1])
const CAP = Number((ARGS.find(a => a.startsWith('--cap=')) || '--cap=25').split('=')[1])

const BUCKET = 'places'
const MAX_PX = 640          // enough for a card/thumbnail, ~60-90 KB per photo
const COST_PER_PHOTO = 0.007
const CONCURRENCY = 6
// Same anchored allowlist as app/api/place-photo/route.ts: the value goes
// straight into an outbound URL.
const NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/

const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

async function ensureBucket() {
  const { data } = await sb.storage.getBucket(BUCKET)
  if (data) return
  const { error } = await sb.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`cannot create bucket ${BUCKET}: ${error.message}`)
  }
}

// PostgREST caps a response at 1000 rows, and the premium tier is ~2.8k — so
// page through explicitly instead of silently working on a truncated queue.
const PAGE = 1000

async function loadQueue(limit) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const want = limit > 0 ? Math.min(PAGE, limit - rows.length) : PAGE
    if (want <= 0) break
    const { data, error } = await sb
      .from('place_photo_queue')
      .select('id,photo_name,photo_author,in_top,rating,user_rating_count')
      .order('in_top', { ascending: false })
      .order('user_rating_count', { ascending: false })
      .order('id', { ascending: true })          // tie-break: stable paging
      .range(from, from + want - 1)
    if (error) throw new Error(`queue read failed: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < want) break
  }
  return rows
}

// Google hands back a ~100-150 KB JPEG at 640px. Re-encoding to WebP cuts that
// to ~30-40 KB for the same visible quality — worth it for a card thumbnail
// that ships on every listing page. If sharp chokes, keep the original bytes.
async function toWebp(buf) {
  try {
    return { buf: await sharp(buf, { failOn: 'none' }).webp({ quality: 72 }).toBuffer(), ext: 'webp', ct: 'image/webp' }
  } catch {
    return { buf, ext: 'jpg', ct: 'image/jpeg' }
  }
}

async function fetchOne(row) {
  if (!NAME_RE.test(row.photo_name || '')) return { ok: false, reason: 'bad photo name' }
  const url = `https://places.googleapis.com/v1/${row.photo_name}/media`
    + `?maxWidthPx=${MAX_PX}&key=${encodeURIComponent(GMAPS_KEY)}`

  let publicUrl
  try {
    const r = await fetch(url, { redirect: 'follow' })
    if (!r.ok) return { ok: false, reason: `google ${r.status}` }
    const { buf, ext, ct } = await toWebp(Buffer.from(await r.arrayBuffer()))
    const key = `${row.id}.${ext}`
    const { error } = await sb.storage.from(BUCKET).upload(key, buf, { contentType: ct, upsert: true })
    if (error) return { ok: false, reason: `upload: ${error.message}` }
    publicUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${key}`
  } catch (e) {
    return { ok: false, reason: `fetch: ${e instanceof Error ? e.message : String(e)}` }
  }

  const { error } = await sb.from('bali_places').update({
    photo_url: publicUrl,
    photo_attr: row.photo_author ?? null,
    photo_fetched_at: new Date().toISOString(),
  }).eq('id', row.id)
  if (error) return { ok: false, reason: `db update: ${error.message}` }
  return { ok: true }
}

// ---- main ----
const queue = await loadQueue(LIMIT)
const affordable = Math.floor(CAP / COST_PER_PHOTO)
const batch = queue.slice(0, affordable)
const inTop = batch.filter(r => r.in_top).length

console.log(`place photos${DRY ? ' [DRY]' : ''}: queue=${queue.length}  batch=${batch.length} (${inTop} shown on listing pages)`)
console.log(`  est. cost $${(batch.length * COST_PER_PHOTO).toFixed(2)}  (cap $${CAP}, $${COST_PER_PHOTO}/photo)`)
if (batch.length < queue.length) console.log(`  !! ${queue.length - batch.length} places left over — raise --cap or --limit to cover them`)

if (DRY) {
  for (const r of batch.slice(0, 5)) console.log(`  · ${r.id} ${r.in_top ? '[top]' : '     '} ${r.rating}★ ${r.user_rating_count}`)
  process.exit(0)
}

await ensureBucket()

let done = 0, failed = 0
const failures = []
let cursor = 0

async function worker() {
  while (cursor < batch.length) {
    const row = batch[cursor++]
    const res = await fetchOne(row)
    if (res.ok) done++
    else { failed++; if (failures.length < 5) failures.push(`${row.id}: ${res.reason}`) }
    if ((done + failed) % 50 === 0) {
      console.log(`  ${done + failed}/${batch.length}  ok=${done} fail=${failed}  ≈$${((done + failed) * COST_PER_PHOTO).toFixed(2)}`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

console.log('\n==== SUMMARY ====')
console.log(`fetched: ${done}   failed: ${failed}   est. spend: $${((done + failed) * COST_PER_PHOTO).toFixed(2)}`)
if (failures.length) console.log('first failures:\n  ' + failures.join('\n  '))
console.log('Re-run refresh_listing_surroundings() to carry the new URLs into listing payloads.')
