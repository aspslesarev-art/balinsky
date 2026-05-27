// Sync villa-unit data from Airtable into raw_villa_units (Supabase) — upserts by airtable_id.
// Source: appPrMGM6h24IekkS / tblfyveBxB1yJbR7d ("Юниты Виллы").
// Units are children of villa records (linked via airtable_id), so no slug/AI
// backfill is needed — listings read units server-side by parent reference.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }

const BASE = 'appPrMGM6h24IekkS'
const TABLE = 'tblfyveBxB1yJbR7d'
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

console.log('▶ upserting to raw_villa_units in batches of 100…')
let done = 0
for (let i = 0; i < rows.length; i += 100) {
  const batch = rows.slice(i, i + 100)
  const { error } = await sb.from('raw_villa_units').upsert(batch, { onConflict: 'airtable_id' })
  if (error) { console.error('  ✖ batch', i, ':', error.message); process.exit(1) }
  done += batch.length
  console.log(`  ${done}/${rows.length}`)
}

// Prune rows present in Supabase but missing from Airtable. Sanity
// guard: refuse to prune if Airtable returned zero rows (almost
// certainly an upstream blip, not a bulk delete).
if (rows.length === 0) {
  console.error('  ✖ Airtable returned 0 rows — refusing to prune Supabase')
  process.exit(1)
}
console.log('▶ pruning rows missing from Airtable…')
const liveIds = new Set(rows.map(r => r.airtable_id))
const { data: existing, error: listErr } = await sb.from('raw_villa_units').select('airtable_id')
if (listErr) { console.error('  ✖ list:', listErr.message); process.exit(1) }
const stale = (existing ?? []).map(r => r.airtable_id).filter(id => !liveIds.has(id))
console.log(`  stale rows: ${stale.length}`)
if (stale.length > 0) {
  for (let i = 0; i < stale.length; i += 500) {
    const slice = stale.slice(i, i + 500)
    const { error: delErr } = await sb.from('raw_villa_units').delete().in('airtable_id', slice)
    if (delErr) { console.error('  ✖ delete:', delErr.message); process.exit(1) }
  }
  console.log(`  ✓ deleted ${stale.length} stale rows`)
}
console.log('✓ done')
