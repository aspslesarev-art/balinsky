import './_retired.mjs'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'developer-logos'
const AIRTABLE_BASE = 'applhWe0pCVRue9QC'
const AIRTABLE_TABLE = 'tbl6vycdDkqIUOMWw'

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

function extFromFilename(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  return ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'bin'
}

await ensureBucket()
const records = await fetchAirtableAll()
console.log(`Airtable records: ${records.length}`)

let done = 0, skipped = 0, failed = 0
for (const rec of records) {
  const logo = rec.fields?.Logo?.[0]
  if (!logo?.url) { skipped++; continue }

  const path = `${rec.id}.${extFromFilename(logo.filename)}`
  try {
    const r = await fetch(logo.url)
    if (!r.ok) throw new Error(`download ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: logo.type ?? 'application/octet-stream',
        upsert: true,
      })
    if (upErr) throw upErr

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path)

    const { error: dbErr } = await sb
      .from('raw_developers')
      .update({ logo_url: publicUrl })
      .eq('airtable_id', rec.id)
    if (dbErr) throw dbErr

    done++
  } catch (e) {
    failed++
    console.error(`${rec.id}: ${e.message}`)
  }
  process.stdout.write(`\r${done + skipped + failed}/${records.length}  done=${done} skip=${skipped} fail=${failed}`)
}
console.log(`\nfinished: done=${done} skipped=${skipped} failed=${failed}`)
