// Helper: download a single attachment URL, upload to a Supabase Storage bucket.
// Returns the permanent public URL or null on failure.
import crypto from 'node:crypto'

export async function downloadAndUpload(sb, bucket, recordId, attachmentUrl) {
  if (!attachmentUrl) return null
  try {
    const r = await fetch(attachmentUrl)
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    const ct = r.headers.get('content-type') || 'image/jpeg'
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8)
    const key = `${recordId}/${hash}.${ext}`
    const { error } = await sb.storage.from(bucket).upload(key, buf, {
      contentType: ct, upsert: true,
    })
    if (error) return null
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    return `${base}/storage/v1/object/public/${bucket}/${key}`
  } catch {
    return null
  }
}

// --- Cached photo sync ------------------------------------------------------
// The per-record download from Airtable is the slow part of the manifest
// syncs (news / events / promo / managers). Airtable attachment objects carry
// a stable `id` and `size` in their METADATA — so we can detect "unchanged
// photo" and skip the download entirely, keyed by `${id}:${size}`.
//
// The cache lives in Supabase Storage (`${bucket}/_photocache.json`) so it
// PERSISTS across CI runs (the runner FS is wiped each run; a local file
// cache never survived, which is why every run re-downloaded everything).

export async function loadPhotoCache(sb, bucket) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const r = await fetch(`${base}/storage/v1/object/public/${bucket}/_photocache.json?t=${Date.now()}`)
    if (r.ok) { const j = await r.json(); if (j && typeof j === 'object') return j }
  } catch { /* empty cache on miss */ }
  return {}
}

export async function savePhotoCache(sb, bucket, cache) {
  try {
    await sb.storage.from(bucket).upload('_photocache.json', Buffer.from(JSON.stringify(cache)), {
      contentType: 'application/json', upsert: true, cacheControl: '60',
    })
  } catch { /* best-effort */ }
}

// Pull `{ id, url, size }` from an Airtable attachment field (first attachment).
export function attachmentOf(field) {
  if (!Array.isArray(field) || field.length === 0) return null
  const a = field[0]
  const url = a?.thumbnails?.large?.url ?? a?.url
  return url ? { id: a.id ?? null, url, size: a.size ?? null } : null
}

// Skip the Airtable download when this exact attachment (id+size) was already
// uploaded; otherwise download, upload, and remember the public URL.
export async function syncAttachment(sb, bucket, recordId, att, cache) {
  if (!att?.url) return null
  const ck = att.id != null && att.size != null ? `${att.id}:${att.size}` : null
  if (ck && cache[ck]) return cache[ck] // unchanged → no download
  try {
    const r = await fetch(att.url)
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    const ct = r.headers.get('content-type') || 'image/jpeg'
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8)
    const key = `${recordId}/${hash}.${ext}`
    const { error } = await sb.storage.from(bucket).upload(key, buf, { contentType: ct, upsert: true })
    if (error) return null
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`
    if (ck) cache[ck] = url
    return url
  } catch {
    return null
  }
}

export async function ensureBucket(sb, bucket) {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === bucket)) {
    const { error } = await sb.storage.createBucket(bucket, { public: true })
    if (error) throw error
    console.log('created bucket', bucket)
  }
}
