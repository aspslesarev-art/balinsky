// Data-only sync of complexes from Airtable applhWe0pCVRue9QC/Комплексы
// → raw_complexes. Skips photo upload (that's the slow part of
// sync-complexes.mjs); fast-friendly so it can run every 15 min next to
// the rest of the catalog data syncs. Run sync-complexes.mjs manually
// when logos / covers change.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
} catch { /* CI env already populated */ }

const BASE = 'applhWe0pCVRue9QC'
const TABLE = 'Комплексы'
const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function slugify(name) {
  if (!name) return null
  let out = ''
  for (const ch of name.toLowerCase()) out += TRANSLIT[ch] ?? ch
  out = out.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return out || null
}

async function fetchAll() {
  const out = []; let offset
  for (let i = 0; i < 200; i++) {
    const u = new URL(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`)
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

console.log('▶ fetching complexes…')
const records = await fetchAll()
console.log('  records:', records.length)

const seen = new Map()
const rows = records.map(rec => {
  const f = rec.fields ?? {}
  let slug = slugify(f.Project) ?? slugify(f['Варианты поиска комлпекса']?.split(',')[0]) ?? rec.id
  const n = (seen.get(slug) ?? 0) + 1
  seen.set(slug, n)
  if (n > 1) slug = `${slug}-${n}`
  return { airtable_id: rec.id, data: f, slug, synced_at: new Date().toISOString() }
})

console.log('▶ upserting raw_complexes…')
let done = 0
for (let i = 0; i < rows.length; i += 100) {
  const batch = rows.slice(i, i + 100)
  const { error } = await sb.from('raw_complexes').upsert(batch, { onConflict: 'airtable_id' })
  if (error) { console.error('  ✖', error.message); process.exit(1) }
  done += batch.length
  process.stdout.write(`\r  ${done}/${rows.length}`)
}
console.log()
