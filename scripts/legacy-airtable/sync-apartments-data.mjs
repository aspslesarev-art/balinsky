import './_retired.mjs'
// Sync apartment data from Airtable into raw_apartments — upserts by airtable_id.
// Source: appK9z6iue7wRtEIS / Table 1 (Апартаменты base). Mirrors sync-villas-data.mjs.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { backfillSlug } from '../_slug-fallback.mjs'
import { applyAiFallback } from '../_ai-fallback.mjs'

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

await applyAiFallback(recs, 'apartment')

let filled = 0
for (const r of recs) {
  if (backfillSlug(r.fields)) filled++
}
if (filled > 0) console.log(`  slug fallback applied to ${filled} record(s)`)

// === Per-unit slug suffix ===========================================
// Each unit gets a -N number appended to its slug so the URL is a
// stable product ID (… -39m2-1-bedroom-1 / -2 / …). Without this,
// two units with the same complex + area + bedrooms collided on one
// URL — only one was reachable. The previous (un-suffixed) slug is
// kept on the row as `_slug_alias` so sync-detail-indexes can ship
// it as a 301-redirect entry for any inbound link to the old URL.
//
// Ordering within a collision group is by Name (A662 < A743), so the
// number assignment is deterministic across syncs.
{
  const bySlug = new Map()
  for (const r of recs) {
    const slugRaw = r.fields?.['SEO:Slug']
    const slug = typeof slugRaw === 'string' ? slugRaw.trim() : null
    if (!slug) continue
    if (!bySlug.has(slug)) bySlug.set(slug, [])
    bySlug.get(slug).push(r)
  }
  let renamed = 0
  for (const [slug, group] of bySlug) {
    group.sort((a, b) => String(a.fields?.['Name'] ?? '').localeCompare(String(b.fields?.['Name'] ?? '')))
    group.forEach((r, idx) => {
      const newSlug = `${slug}-${idx + 1}`
      r.fields['_slug_alias'] = slug
      r.fields['SEO:Slug'] = newSlug
      renamed++
    })
  }
  console.log(`  slug -N suffix: assigned to ${renamed} record(s) across ${bySlug.size} group(s)`)
}

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
// Never prune admin-created rows (adm_ prefix) — they live only in Supabase.
const stale = (existing ?? []).map(r => r.airtable_id).filter(id => !liveIds.has(id) && !String(id).startsWith('adm_'))
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

const { notifyAgents } = await import('./_agent-notify.mjs')
function _fs(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.length) return _fs(v[0])
  if (v && typeof v === 'object' && 'value' in v) return _fs(v.value)
  return null
}
const pubRecs = recs.filter(r => r.fields?.['Опубликовать'] === true)
await notifyAgents('apartments', pubRecs.map(r => ({
  sourceId: r.id,
  developerNames: [r.fields['Developer1'], r.fields['Developer']].map(_fs).filter(Boolean),
  title: _fs(r.fields['SEO:Title']) ?? _fs(r.fields['ИИ Имя']) ?? r.id,
  body: null,
  path: _fs(r.fields['SEO:Slug']) ? `/ru/apartamenty/o/${_fs(r.fields['SEO:Slug'])}` : null,
})))

const { syncPriceChanges } = await import('./_price-diff.mjs')
await syncPriceChanges({
  source: 'apartments',
  snapshotKey: '_prices-apartments.json',
  records: pubRecs,
  describe: ({ id, fields }) => ({
    priceRaw: fields['price_usd'] ?? fields['Цена'],
    developerNames: [fields['Developer1'], fields['Developer']].map(_fs).filter(Boolean),
    title: _fs(fields['SEO:Title']) ?? _fs(fields['ИИ Имя']) ?? id,
    path: _fs(fields['SEO:Slug']) ? `/ru/apartamenty/o/${_fs(fields['SEO:Slug'])}` : null,
  }),
})
