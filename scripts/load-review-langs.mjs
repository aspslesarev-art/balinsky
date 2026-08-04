// Land the language-neutral review sample into bali_places.rev_langs.
//
// Deliberately narrow: it touches ONLY the three rev_* columns and never the
// `data` blob, so the rich pass 1-3 record (Russian review texts the site and
// Balina already use) stays exactly as it is. What we take from the neutral
// sweep is just the histogram of review languages — the signal for "is this
// place visited by foreigners or by locals".
//
// Usage:
//   node scripts/load-review-langs.mjs                              # default p4 file
//   node scripts/load-review-langs.mjs --in=scripts/_bali-tourism-p5.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const IN_PATH = (process.argv.slice(2).find(a => a.startsWith('--in=')) || '--in=scripts/_bali-tourism-p4.json').split('=')[1]
// Which sweep this file came from: `en` (English preference, default) or `id`
// (Indonesian preference). They land in different columns — the comparison
// between the two is what actually identifies a tourist spot.
const COL = (process.argv.slice(2).find(a => a.startsWith('--col=')) || '--col=en').split('=')[1]
if (!['en', 'id'].includes(COL)) { console.error('--col must be en or id'); process.exit(1) }
const places = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'))
const now = new Date().toISOString()

const rows = []
for (const p of Object.values(places)) {
  const reviews = Array.isArray(p.reviews) ? p.reviews : []
  const langs = {}
  for (const r of reviews) {
    const lang = r?.originalText?.languageCode ?? r?.text?.languageCode
    if (!lang) continue
    langs[lang] = (langs[lang] ?? 0) + 1
  }
  const sampled = Object.values(langs).reduce((a, b) => a + b, 0)
  if (!sampled) continue
  rows.push(COL === 'id'
    ? { id: p.id, rev_langs_id: langs, rev_sampled_id: sampled, rev_neutral_at: now }
    : { id: p.id, rev_langs: langs, rev_sampled: sampled, rev_neutral_at: now })
}

console.log(`${rows.length} places with a neutral review sample (of ${Object.keys(places).length} in file)`)

const BATCH = 200
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let done = 0, failed = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  let ok = false
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    // The place may not be in the table yet (a neutral sweep can surface
    // something the earlier passes missed) — upsert, but only these columns.
    const { error } = await sb.from('bali_places').upsert(slice, { onConflict: 'id' })
    if (!error) { ok = true; break }
    if (attempt === 4) { console.error(`\n  batch ${i} failed: ${error.message}`); failed += slice.length }
    else await sleep(1000 * attempt)
  }
  done += slice.length
  process.stdout.write(`\r  written ${done}/${rows.length}`)
}

console.log(`\ndone${failed ? `, ${failed} rows failed` : ''}. Check public.place_tourist_profile for foreign_share.`)
