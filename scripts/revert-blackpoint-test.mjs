// Wipes everything imported by import-blackpoint-test.mjs:
//   - delete from raw_villas where airtable_id like 'bptest_%'
//   - delete the photo objects from villa-photos/bptest_*
//   - drop those keys from villa-photos/_manifest.json
//
// Safe to re-run; idempotent.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const PREFIX = 'bptest_'

console.log('1) deleting raw_villas with airtable_id like', PREFIX + '%')
const { data: removed, error: delErr } = await sb
  .from('raw_villas')
  .delete()
  .like('airtable_id', `${PREFIX}%`)
  .select('airtable_id')
if (delErr) { console.error('  failed:', delErr.message); process.exit(1) }
console.log(`  removed ${removed?.length ?? 0} rows`)

console.log('2) listing photo files under villa-photos/' + PREFIX + '*')
const { data: roots, error: lsErr } = await sb.storage.from('villa-photos').list('', { limit: 1000 })
if (lsErr) { console.error('  list failed:', lsErr.message); process.exit(1) }
const folders = (roots ?? []).filter(o => o.name.startsWith(PREFIX)).map(o => o.name)
console.log(`  ${folders.length} bptest folders`)

let removedFiles = 0
for (const folder of folders) {
  const { data: files } = await sb.storage.from('villa-photos').list(folder, { limit: 50 })
  const paths = (files ?? []).map(f => `${folder}/${f.name}`)
  if (paths.length === 0) continue
  const { error: rmErr } = await sb.storage.from('villa-photos').remove(paths)
  if (rmErr) { console.warn('  rm', folder, ':', rmErr.message); continue }
  removedFiles += paths.length
}
console.log(`  removed ${removedFiles} photo files`)

console.log('3) cleaning villa-photos/_manifest.json')
const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
let manifest = {}
try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok) manifest = await r.json() } catch {}
const before = Object.keys(manifest).length
for (const k of Object.keys(manifest)) if (k.startsWith(PREFIX)) delete manifest[k]
const after = Object.keys(manifest).length
const buf = Buffer.from(JSON.stringify(manifest), 'utf8')
const { error: upErr } = await sb.storage.from('villa-photos').upload('_manifest.json', buf, {
  contentType: 'application/json', upsert: true, cacheControl: '60',
})
if (upErr) { console.warn('  manifest upload:', upErr.message) }
console.log(`  manifest entries: ${before} → ${after}`)

console.log('done.')
