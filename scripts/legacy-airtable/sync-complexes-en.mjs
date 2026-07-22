import './_retired.mjs'
// Merge EN fields from the secondary "Комплексы" base (appXy81LjlrYkTqyZ)
// into raw_complexes. The primary sync uses applhWe0pCVRue9QC/Комплексы which
// has no EN columns; the second base is editorial-managed and holds the
// translations. Records are matched by normalized Project name (slugs and
// IDs differ between the two bases). 183/186 raw rows match 1:1 today.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
} catch { /* CI env already populated */ }

const EN_BASE = 'appXy81LjlrYkTqyZ'
const EN_TABLE = 'Комплексы'
const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Editor-translated columns we mirror into raw_complexes.data so detail and
// catalog pages can render EN text via tField()/tFieldOrRu().
const EN_COLUMNS = [
  'Статус EN',
  'Статус продаж EN',
  'Описание EN',
  'ИИ Описание EN',
  'SEO:Title EN',
  'SEO:Description EN',
  'SEO Text EN',
  'Social:Title EN',
  'Social:description EN',
  'Саммари саммари EN',
  'Назначение земли EN',
]

function norm(s) {
  return String(s ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/[^а-яa-z0-9 ]/gi, '').trim()
}

async function fetchAll(base, table) {
  const out = []
  let offset
  for (let i = 0; i < 200; i++) {
    const u = new URL(`https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`)
    u.searchParams.set('pageSize', '100')
    if (offset) u.searchParams.set('offset', offset)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
    const j = await r.json()
    out.push(...j.records)
    if (!j.offset) break
    offset = j.offset
  }
  return out
}

console.log('▶ fetching appXy81 / Комплексы…')
const ext = await fetchAll(EN_BASE, EN_TABLE)
console.log('  records:', ext.length)

// Group by normalized Project name, drop duplicates so we only update
// rows whose source is unambiguous.
const byName = new Map()
for (const rec of ext) {
  const k = norm(rec.fields.Project)
  if (!k) continue
  if (!byName.has(k)) byName.set(k, [])
  byName.get(k).push(rec)
}

const { data: rows } = await sb.from('raw_complexes').select('airtable_id, data').limit(1000)
console.log('▶ raw_complexes rows:', rows.length)

let updated = 0, skippedAmbiguous = 0, skippedNoMatch = 0, unchanged = 0, failed = 0
for (const r of rows) {
  const k = norm(r.data?.Project)
  const hits = byName.get(k) || []
  if (hits.length > 1) { skippedAmbiguous++; continue }
  if (hits.length === 0) { skippedNoMatch++; continue }
  const src = hits[0]
  const patch = {}
  for (const col of EN_COLUMNS) {
    const v = src.fields[col]
    if (v == null) continue
    patch[col] = v
  }
  if (Object.keys(patch).length === 0) { unchanged++; continue }
  // Skip if all the EN values we'd write are already identical (no-op
  // updates count toward Supabase quotas and we re-run hourly).
  const same = Object.entries(patch).every(([col, v]) => JSON.stringify(r.data[col]) === JSON.stringify(v))
  if (same) { unchanged++; continue }
  const merged = { ...r.data, ...patch }
  const { error } = await sb.from('raw_complexes').update({ data: merged }).eq('airtable_id', r.airtable_id)
  if (error) { failed++; console.error(`\n${r.airtable_id}: ${error.message}`) }
  else updated++
  process.stdout.write(`\r  processed ${updated + skippedAmbiguous + skippedNoMatch + unchanged + failed}/${rows.length}  updated=${updated} unchanged=${unchanged} skip-ambig=${skippedAmbiguous} skip-nomatch=${skippedNoMatch} fail=${failed}`)
}
console.log()
