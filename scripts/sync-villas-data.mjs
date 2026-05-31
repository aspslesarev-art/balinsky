// Sync villa data from Airtable into raw_villas (Supabase) — upserts by airtable_id.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { backfillSlug } from './_slug-fallback.mjs'
import { applyAiFallback } from './_ai-fallback.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }

const BASE = 'appAwgCAwOIQs2DJh'
const TABLE = 'tblRD00AhDNrpW3DA'
const TOKEN = process.env.AIRTABLE_TOKEN

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function fetchAirtableAll() {
  const all = []
  let offset
  for (let i = 0; i < 200; i++) {
    const u = new URL(`https://api.airtable.com/v0/${BASE}/${TABLE}`)
    u.searchParams.set('pageSize', '100')
    if (offset) u.searchParams.set('offset', offset)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
    const j = await r.json()
    all.push(...j.records)
    if (!j.offset) break
    offset = j.offset
  }
  return all
}

console.log('▶ fetching Airtable…')
const recs = await fetchAirtableAll()
console.log('  records:', recs.length)

// Backfill AI-errored fields (SEO Text, ИИ Имя, etc.) via Azure GPT
// BEFORE deriving the slug, so the slug fallback can read the freshly
// generated SEO:Title instead of the error stub.
await applyAiFallback(recs, 'villa')

let filled = 0
for (const r of recs) {
  if (backfillSlug(r.fields)) filled++
}
if (filled > 0) console.log(`  slug fallback applied to ${filled} record(s)`)

const rows = recs.map(r => ({
  airtable_id: r.id,
  data: r.fields,
  synced_at: new Date().toISOString(),
}))

console.log('▶ upserting to raw_villas in batches of 100…')
let done = 0
for (let i = 0; i < rows.length; i += 100) {
  const batch = rows.slice(i, i + 100)
  const { error } = await sb.from('raw_villas').upsert(batch, { onConflict: 'airtable_id' })
  if (error) { console.error('  ✖ batch', i, ':', error.message); process.exit(1) }
  done += batch.length
  console.log(`  ${done}/${rows.length}`)
}

// Prune rows present in Supabase but missing from Airtable. Without
// this the "delete from Airtable" never propagates: the row sticks
// in raw_villas forever and keeps rendering on the site. Sanity
// guard: refuse to prune if Airtable returned zero rows (almost
// certainly an upstream blip, not a bulk delete).
if (rows.length === 0) {
  console.error('  ✖ Airtable returned 0 rows — refusing to prune Supabase')
  process.exit(1)
}
console.log('▶ pruning rows missing from Airtable…')
const liveIds = new Set(rows.map(r => r.airtable_id))
const { data: existing, error: listErr } = await sb.from('raw_villas').select('airtable_id')
if (listErr) { console.error('  ✖ list:', listErr.message); process.exit(1) }
// Never prune admin-created rows (adm_ prefix) — they live only in Supabase
// and aren't in Airtable, so they'd otherwise look "stale" and get deleted.
const stale = (existing ?? []).map(r => r.airtable_id).filter(id => !liveIds.has(id) && !String(id).startsWith('adm_'))
console.log(`  stale rows: ${stale.length}`)
if (stale.length > 0) {
  for (let i = 0; i < stale.length; i += 500) {
    const slice = stale.slice(i, i + 500)
    const { error: delErr } = await sb.from('raw_villas').delete().in('airtable_id', slice)
    if (delErr) { console.error('  ✖ delete:', delErr.message); process.exit(1) }
  }
  console.log(`  ✓ deleted ${stale.length} stale rows`)
}
console.log('✓ done')

// Push fresh items to subscribed agents. Only previously-unseen Airtable
// records actually fire — see lib/agent-notify.ts for the dedup ledger.
const { notifyAgents } = await import('./_agent-notify.mjs')
function _fs(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.length) return _fs(v[0])
  if (v && typeof v === 'object' && 'value' in v) return _fs(v.value)
  return null
}
const pubRecs = recs.filter(r => r.fields?.['Опубликовать'] === true)
await notifyAgents('villas', pubRecs.map(r => ({
  sourceId: r.id,
  developerNames: [r.fields['Developer1'], r.fields['Developer']].map(_fs).filter(Boolean),
  title: _fs(r.fields['SEO:Title']) ?? _fs(r.fields['ИИ Имя']) ?? _fs(r.fields['Name']) ?? r.id,
  body: null,
  path: _fs(r.fields['SEO:Slug']) ? `/ru/villy/o/${_fs(r.fields['SEO:Slug'])}` : null,
})))

const { syncPriceChanges } = await import('./_price-diff.mjs')
await syncPriceChanges({
  source: 'villas',
  snapshotKey: '_prices-villas.json',
  records: pubRecs,
  describe: ({ id, fields }) => ({
    priceRaw: fields['price'] ?? fields['Цена'],
    developerNames: [fields['Developer1'], fields['Developer']].map(_fs).filter(Boolean),
    title: _fs(fields['SEO:Title']) ?? _fs(fields['ИИ Имя']) ?? _fs(fields['Name']) ?? id,
    path: _fs(fields['SEO:Slug']) ? `/ru/villy/o/${_fs(fields['SEO:Slug'])}` : null,
  }),
})

// Quick verify
const sample = recs.find(r => r.fields[' Aggregator:RU '] || r.fields['Aggregator:RU'])
if (sample) {
  console.log('\nSample record with Aggregator:RU:')
  console.log('  id:', sample.id)
  const ru = sample.fields[' Aggregator:RU '] ?? sample.fields['Aggregator:RU']
  console.log('  Aggregator:RU first 200:', String(ru ?? '').slice(0, 200))
}
