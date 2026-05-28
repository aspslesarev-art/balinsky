// One-shot: backfill agent_notification_log with every existing Airtable id
// from raw_villas / raw_apartments / raw_complexes plus the news / promo /
// events manifests. Without this seed, the next sync run would treat
// thousands of existing items as "new" and broadcast them all.
//
// Idempotent: re-runs upsert into the same primary key.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

async function insertBatch(source, ids) {
  if (ids.length === 0) return
  const rows = ids.map(source_id => ({ source_table: source, source_id }))
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500)
    const { error } = await sb.from('agent_notification_log').upsert(slice, { onConflict: 'source_table,source_id' })
    if (error) { console.error(`  ✖ ${source}[${i}]:`, error.message); throw error }
  }
  console.log(`  ${source}: ${ids.length} seeded`)
}

// Tables — full airtable_id list
for (const t of ['raw_villas', 'raw_apartments', 'raw_complexes']) {
  const source = t.replace('raw_', '')
  const { data, error } = await sb.from(t).select('airtable_id')
  if (error) { console.error(`✖ ${t}:`, error.message); process.exit(1) }
  await insertBatch(source, (data ?? []).map(r => r.airtable_id))
}

// Storage manifests for news / promo / events
async function readManifestIds(bucket, key) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`)
  if (!r.ok) { console.warn(`  (${bucket}/${key} not found — skipping)`); return [] }
  const j = await r.json()
  return (j.items ?? []).map(it => it.id).filter(Boolean)
}

await insertBatch('news',   await readManifestIds('news',   '_news.json'))
await insertBatch('promo',  await readManifestIds('promo',  '_promo.json'))
await insertBatch('events', await readManifestIds('events', '_events.json'))

console.log('done')
