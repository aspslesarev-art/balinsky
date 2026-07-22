import './_retired.mjs'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { cdnRewrite } from '../_cdn.mjs'

// Load .env.local for local runs. In CI env vars come from secrets and
// .env.local doesn't exist — try/catch keeps the script working in both.
try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
} catch { /* CI: vars already in env */ }

const AIRTABLE_BASE = 'applhWe0pCVRue9QC'
const AIRTABLE_TABLE = 'Комплексы'
const LOGOS = 'complex-logos'
const COVERS = 'complex-covers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function ensureBucket(name) {
  const { data: buckets, error } = await sb.storage.listBuckets()
  if (error) throw error
  if (buckets.some(b => b.name === name)) return
  const { error: cErr } = await sb.storage.createBucket(name, { public: true })
  if (cErr) throw cErr
  console.log(`created bucket ${name}`)
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

const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function slugify(name) {
  if (!name) return null
  const lowered = name.toLowerCase()
  let out = ''
  for (const ch of lowered) out += TRANSLIT[ch] ?? ch
  out = out.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return out || null
}

function extFromFilename(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  return ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'bin'
}

// Cache-bust the public URL with the Airtable attachment id. Storage
// upserts to a fixed path (`<recId>.<ext>`), so without versioning
// browsers serve a stale copy after an editor swaps the cover. The
// att-id is stable across editor sessions but flips when the
// attachment is replaced — exactly the right invalidation key.
function attVersion(att) {
  const id = att?.id ?? ''
  return id.startsWith('att') ? id.slice(3) : id
}

async function uploadAttachment(bucket, recId, attachment) {
  if (!attachment?.url) return null
  const r = await fetch(attachment.url)
  if (!r.ok) throw new Error(`download ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  const path = `${recId}.${extFromFilename(attachment.filename)}`
  const { error } = await sb.storage.from(bucket).upload(path, buf, {
    contentType: attachment.type ?? 'application/octet-stream',
    upsert: true,
  })
  if (error) throw error
  const baseUrl = cdnRewrite(sb.storage.from(bucket).getPublicUrl(path).data.publicUrl)
  const v = attVersion(attachment)
  return v ? `${baseUrl}?v=${v}` : baseUrl
}

await ensureBucket(LOGOS)
await ensureBucket(COVERS)

const records = await fetchAirtableAll()
console.log(`Airtable records: ${records.length}`)

const seen = new Map()
const rows = records.map(rec => {
  const f = rec.fields ?? {}
  let slug = slugify(f.Project) ?? slugify(f['Варианты поиска комлпекса']?.split(',')[0]) ?? rec.id
  const n = (seen.get(slug) ?? 0) + 1
  seen.set(slug, n)
  if (n > 1) slug = `${slug}-${n}`
  return {
    airtable_id: rec.id,
    data: f,
    slug,
    synced_at: new Date().toISOString(),
  }
})

const BATCH = 100
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH)
  const { error } = await sb.from('raw_complexes').upsert(chunk, { onConflict: 'airtable_id' })
  if (error) throw error
  process.stdout.write(`\rupserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
}
console.log()

let done = 0, skipped = 0, failed = 0
for (const rec of records) {
  const f = rec.fields ?? {}
  const logo = f.Logo?.[0]
  const cover = f['Opt image']?.[0] ?? f['Opt photos']?.[0]
  if (!logo && !cover) { skipped++; continue }

  try {
    const [logoUrl, coverUrl] = await Promise.all([
      logo ? uploadAttachment(LOGOS, rec.id, logo) : null,
      cover ? uploadAttachment(COVERS, rec.id, cover) : null,
    ])
    const patch = {}
    if (logoUrl) patch.logo_url = logoUrl
    if (coverUrl) patch.cover_url = coverUrl
    if (Object.keys(patch).length) {
      const { error } = await sb.from('raw_complexes').update(patch).eq('airtable_id', rec.id)
      if (error) throw error
    }
    done++
  } catch (e) {
    failed++
    console.error(`\n${rec.id}: ${e.message}`)
  }
  process.stdout.write(`\rimages ${done + skipped + failed}/${records.length}  done=${done} skip=${skipped} fail=${failed}`)
}
console.log(`\nfinished: done=${done} skipped=${skipped} failed=${failed}`)
