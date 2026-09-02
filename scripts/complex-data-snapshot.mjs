// Снимок и откат JSONB `data` одной строки raw_complexes.
//
// Правки контента в /admin/data необратимы — старого значения нигде не
// остаётся. Перед пачкой ручных правок снимаем снимок, коммитим его рядом с
// кодом, и любой откат — это одна команда.
//
//   node scripts/complex-data-snapshot.mjs save <slug>
//   node scripts/complex-data-snapshot.mjs restore scripts/snapshots/<файл>.json [--dry-run]
//
// restore возвращает `data` ЦЕЛИКОМ в состояние снимка: всё, что изменилось
// после него, будет потеряно — это и есть смысл отката.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const envFile = fs.readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('env not set')
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const SNAP_DIR = 'scripts/snapshots'
const [cmd, arg] = process.argv.slice(2)
const DRY = process.argv.includes('--dry-run')

if (cmd === 'save') {
  if (!arg) { console.error('usage: save <slug>'); process.exit(1) }
  const { data, error } = await sb.from('raw_complexes').select('airtable_id, slug, data').eq('slug', arg).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) { console.error(`нет ЖК со slug «${arg}»`); process.exit(1) }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  fs.mkdirSync(SNAP_DIR, { recursive: true })
  const file = path.join(SNAP_DIR, `${data.slug}-${stamp}.json`)
  fs.writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), airtable_id: data.airtable_id, slug: data.slug, data: data.data }, null, 2))
  console.log(`снимок: ${file} (${Object.keys(data.data ?? {}).length} полей)`)
  process.exit(0)
}

if (cmd === 'restore') {
  if (!arg) { console.error('usage: restore <snapshot.json> [--dry-run]'); process.exit(1) }
  const snap = JSON.parse(fs.readFileSync(arg, 'utf8'))
  if (!snap.airtable_id || !snap.data) throw new Error('битый снимок: нет airtable_id или data')
  const { data: cur, error: readErr } = await sb.from('raw_complexes').select('data').eq('airtable_id', snap.airtable_id).maybeSingle()
  if (readErr) throw new Error(readErr.message)
  const keysNow = Object.keys(cur?.data ?? {})
  const keysSnap = Object.keys(snap.data)
  const added = keysNow.filter(k => !keysSnap.includes(k))
  const changed = keysSnap.filter(k => JSON.stringify(cur?.data?.[k]) !== JSON.stringify(snap.data[k]))
  console.log(`${snap.slug} (${snap.airtable_id}), снимок от ${snap.takenAt}`)
  console.log(`  будут удалены поля: ${added.length ? added.join(', ') : '—'}`)
  console.log(`  будут возвращены значения: ${changed.length ? changed.join(', ') : '—'}`)
  if (DRY) { console.log('  --dry-run, ничего не записано'); process.exit(0) }
  const { error } = await sb.from('raw_complexes').update({ data: snap.data }).eq('airtable_id', snap.airtable_id)
  if (error) throw new Error(error.message)
  console.log('  откат применён')
  process.exit(0)
}

console.error('usage: node scripts/complex-data-snapshot.mjs save <slug> | restore <snapshot.json> [--dry-run]')
process.exit(1)
