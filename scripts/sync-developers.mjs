// Sync developers (Застройщики) from Airtable → Supabase raw_developers.
//
// Source of truth: base applhWe0pCVRue9QC, table "Imported table" — that's
// where editorial bullets and AI translations live (Строительство и недвижимость,
// Репутация и опыт, Техника и производство, Управляющая компания + their EN
// counterparts). The previous raw_developers content predates the EN columns,
// so we replace `data` wholesale and let logo_url stay as-is (managed by
// migrate-logos.mjs / finalize-logos.mjs).
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const AIRTABLE_BASE = 'applhWe0pCVRue9QC'
const AIRTABLE_TABLE = 'Imported table'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const TOKEN = process.env.AIRTABLE_TOKEN

async function fetchAll() {
  const out = []
  let offset
  for (let i = 0; i < 200; i++) {
    const u = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_TABLE)}`)
    u.searchParams.set('pageSize', '100')
    if (offset) u.searchParams.set('offset', offset)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`)
    const j = await r.json()
    out.push(...j.records)
    if (!j.offset) break
    offset = j.offset
  }
  return out
}

console.log('▶ fetching developers from', AIRTABLE_BASE, '/', AIRTABLE_TABLE)
const records = await fetchAll()
console.log('  fetched:', records.length)

// raw_developers permissions deny INSERT for the service key (table was
// originally populated by an external pipeline). All 112 records already
// exist, so we update in place rather than upsert.
const rows = records.map(rec => ({
  airtable_id: rec.id,
  data: rec.fields ?? {},
  synced_at: new Date().toISOString(),
}))

let done = 0, failed = 0, missing = 0
for (const row of rows) {
  const { data, error } = await sb
    .from('raw_developers')
    .update({ data: row.data, synced_at: row.synced_at })
    .eq('airtable_id', row.airtable_id)
    .select('airtable_id')
  if (error) { failed++; console.error(`\n${row.airtable_id}: ${error.message}`) }
  else if (!data || data.length === 0) missing++
  else done++
  process.stdout.write(`\r  updated ${done + failed + missing}/${rows.length}  done=${done} missing=${missing} failed=${failed}`)
}
console.log()
if (missing) console.log(`  note: ${missing} Airtable records have no row in raw_developers (would need INSERT permission to add)`)

// Sanity check — count rows that now carry the EN bullet field.
const withEn = rows.filter(r => {
  const v = r.data['Строительство и недвижимость EN']
  const s = typeof v === 'object' && v?.value !== undefined ? v.value : v
  return typeof s === 'string' && s.trim().length > 0
}).length
console.log(`✓ done — ${rows.length} developers, ${withEn} with EN bullets`)
