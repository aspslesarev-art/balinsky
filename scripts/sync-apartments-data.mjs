// Sync apartment data from Airtable into raw_apartments — upserts by airtable_id.
// Source: appK9z6iue7wRtEIS / Table 1 (Апартаменты base). Mirrors sync-villas-data.mjs.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
} catch { /* CI env already populated */ }

const BASE = 'appK9z6iue7wRtEIS'
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

const rows = recs.map(r => ({
  airtable_id: r.id,
  data: r.fields,
  synced_at: new Date().toISOString(),
}))

console.log('▶ upserting to raw_apartments in batches of 100…')
let done = 0
for (let i = 0; i < rows.length; i += 100) {
  const batch = rows.slice(i, i + 100)
  const { error } = await sb.from('raw_apartments').upsert(batch, { onConflict: 'airtable_id' })
  if (error) { console.error('  ✖ batch', i, ':', error.message); process.exit(1) }
  done += batch.length
  console.log(`  ${done}/${rows.length}`)
}

// Prune rows that exist in Supabase but no longer in Airtable. Without
// this an editor's "delete from Airtable" never propagates — the row
// stays in raw_apartments forever and the listing keeps showing on the
// site. Sanity guard: refuse to prune if Airtable returned zero records
// (almost certainly an upstream blip rather than a bulk delete) so we
// can never accidentally nuke the table.
if (rows.length === 0) {
  console.error('  ✖ Airtable returned 0 rows — refusing to prune Supabase')
  process.exit(1)
}
console.log('▶ pruning rows missing from Airtable…')
const liveIds = new Set(rows.map(r => r.airtable_id))
const { data: existing, error: listErr } = await sb.from('raw_apartments').select('airtable_id')
if (listErr) { console.error('  ✖ list:', listErr.message); process.exit(1) }
const stale = (existing ?? []).map(r => r.airtable_id).filter(id => !liveIds.has(id))
console.log(`  stale rows: ${stale.length}`)
if (stale.length > 0) {
  // chunk the in() because Postgres has a parameter limit and very
  // large lists can hit URL length caps on the PostgREST side.
  for (let i = 0; i < stale.length; i += 500) {
    const slice = stale.slice(i, i + 500)
    const { error: delErr } = await sb.from('raw_apartments').delete().in('airtable_id', slice)
    if (delErr) { console.error('  ✖ delete:', delErr.message); process.exit(1) }
  }
  console.log(`  ✓ deleted ${stale.length} stale rows`)
}

const enFilled = rows.filter(r => {
  const v = r.data['SEO:Title EN']
  const s = typeof v === 'object' && v?.value !== undefined ? v.value : v
  return typeof s === 'string' && s.trim().length > 0
}).length
console.log(`✓ done — ${rows.length} apartments, ${enFilled} with SEO:Title EN`)
