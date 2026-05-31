// Sync the Airtable district tables → a Supabase Storage manifest
// (districts/_districts.json), keyed by the Airtable record id so the admin
// "Районы" base and the link pickers (villa Location filter / apartment
// Location) can resolve id → name.
//
// Two source tables (villas base "Районы", apartments base "Описание районов")
// are merged; ids are globally unique so the union is safe.
//
// Env: AIRTABLE_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY

import { createClient } from '@supabase/supabase-js'

const TOK = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = 'districts'
const KEY = '_districts.json'

const SOURCES = [
  { base: 'appAwgCAwOIQs2DJh', table: 'tblTfuXxKa3vzRCwU', label: 'villas Районы' },
  { base: 'appK9z6iue7wRtEIS', table: 'tblM42lb63YXfngwa', label: 'apartments Описание районов' },
]

async function fetchAll(base, table) {
  const out = []
  let offset
  do {
    const u = new URL(`https://api.airtable.com/v0/${base}/${table}`)
    u.searchParams.set('pageSize', '100')
    if (offset) u.searchParams.set('offset', offset)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOK}` } })
    if (!r.ok) throw new Error(`airtable ${base}/${table}: ${r.status} ${await r.text()}`)
    const j = await r.json()
    out.push(...(j.records || []))
    offset = j.offset
  } while (offset)
  return out
}

async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets()
  if (!(buckets || []).some(b => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`createBucket: ${error.message}`)
    console.log(`  ✓ created public bucket ${BUCKET}`)
  }
}

const fs = v => Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

async function main() {
  await ensureBucket()
  const byId = new Map()
  for (const s of SOURCES) {
    const recs = await fetchAll(s.base, s.table)
    console.log(`  ${s.label}: ${recs.length} records`)
    for (const rec of recs) {
      const f = rec.fields || {}
      const name = fs(f['Name'])
      if (!name) continue
      byId.set(rec.id, {
        id: rec.id,
        name: String(name),
        descRu: f['Описание района'] ?? null,
        descEn: f['Описание района ENG'] ?? null,
        source: s.label,
      })
    }
  }
  const items = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const body = Buffer.from(JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items }))
  const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
    contentType: 'application/json', upsert: true, cacheControl: '300',
  })
  if (error) throw new Error(`upload: ${error.message}`)
  console.log(`✓ wrote ${BUCKET}/${KEY} — ${items.length} districts`)
}

main().catch(e => { console.error('✖', e.message); process.exit(1) })
