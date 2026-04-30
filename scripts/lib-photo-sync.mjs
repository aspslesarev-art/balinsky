// Helper: download a single attachment URL, upload to a Supabase Storage bucket.
// Returns the permanent public URL or null on failure.
import path from 'node:path'
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

export async function ensureBucket(sb, bucket) {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === bucket)) {
    const { error } = await sb.storage.createBucket(bucket, { public: true })
    if (error) throw error
    console.log('created bucket', bucket)
  }
}
