// Targeted: translate missing EN listing TITLES (SEO:Title / ИИ Имя) via OpenAI
// into the same feeds/_translations-<section>.json cache the site + consultant
// read. Non-destructive: merges title fields into existing cache entries,
// preserving already-translated body fields. Batched for speed.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { chat, requirePaid } from './_openai.mjs'

const e = fs.readFileSync('/Users/andrei/balinsky/.env.local', 'utf8')
for (const l of e.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const uw = v => { if (v == null) return null; if (typeof v === 'string') return v.trim() || null; if (Array.isArray(v)) { for (const x of v) { const u = uw(x); if (u) return u } return null } if (typeof v === 'object' && 'value' in v) return uw(v.value); return null }
const clean = t => t ? t.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() : t

const SECTIONS = [
  { name: 'villas', table: 'raw_villas' },
  { name: 'apartments', table: 'raw_apartments' },
  { name: 'complexes', table: 'raw_complexes' },
]

const SYS = `You translate Russian Bali real-estate listing HEADLINES into natural English for balinsky.info.
Input: a JSON array of Russian headline strings. Output: ONE JSON object {"titles": [...]} with the English headlines in the SAME order and count.
Rules:
- Bali place names (Canggu, Pererenan, Ubud, Uluwatu, Bukit, Nusa Dua, Sanur, Berawa, Seseh, Umalas, Babakan, Batu Bolong, Nyanyi, Pandawa, Ungasan, etc.) stay in Latin script. Russian place spellings → their standard Latin form (Убуд→Ubud, Чангу→Canggu, Бали→Bali).
- Project / villa / complex proper names keep their original Latin spelling; transliterate Russian-only names to Latin.
- Natural English real-estate headline, ≤ 9 words, no emoji, no trailing punctuation, no "| Balinsky".
- Pattern like "{Project} {Type} in {District}, Bali — {Area} m², {N}-Bedroom" or "{N}-Bedroom {Type} in {District}, Bali". Do not calque Russian word order.
- Preserve numbers/units (m², bedrooms).`

async function callAI(titles) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const j = await chat({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: JSON.stringify(titles) }], temperature: 0.3, response_format: { type: 'json_object' } })
      const out = JSON.parse(j.choices[0].message.content)
      const arr = Array.isArray(out) ? out : out.titles
      if (!Array.isArray(arr) || arr.length !== titles.length) throw new Error(`length mismatch ${arr?.length} vs ${titles.length}`)
      return arr
    } catch (err) { if (attempt < 3) { console.warn('  retry:', err.message); await new Promise(s => setTimeout(s, 1500 * (attempt + 1))) } else throw err }
  }
}

async function loadCache(name) {
  const { data, error } = await sb.storage.from('feeds').download(`_translations-${name}.json`)
  if (error || !data) return {}
  try { return JSON.parse(await data.text()) } catch { return {} }
}

// Pass 1 (free, Supabase only): build the plan for every section, so the
// paid-run guard can show the full count before a single OpenAI request.
const plans = []
for (const { name, table } of SECTIONS) {
  const cache = await loadCache(name)
  const rows = []
  for (let off = 0; ; off += 500) {
    const { data } = await sb.from(table).select('airtable_id, data').range(off, off + 499)
    if (!data || !data.length) break
    rows.push(...data); if (data.length < 500) break
  }
  // Plan: rows with a RU title but NO EN title anywhere (Airtable slot or cache).
  const plan = []
  for (const r of rows) {
    const d = r.data || {}; const id = r.airtable_id; if (!id) continue
    if (uw(d['SEO:Title EN']) || uw(d['ИИ Имя EN'])) continue        // Airtable already has EN
    const c = cache[id] || {}
    if (uw(c['SEO:Title']) || uw(c['ИИ Имя'])) continue               // cache already has EN
    const ru = clean(uw(d['SEO:Title'])) || clean(uw(d['ИИ Имя']))
    if (!ru) continue
    plan.push({ id, ru })
  }
  console.log(`=== ${name}: rows=${rows.length}, need EN title=${plan.length} ===`)
  plans.push({ name, cache, plan })
}
const BATCH = 15
const totalTitles = plans.reduce((a, p) => a + p.plan.length, 0)
const totalCalls = plans.reduce((a, p) => a + Math.ceil(p.plan.length / BATCH), 0)
requirePaid({ what: `EN-заголовки листингов (запросов: ${totalCalls}, по ${BATCH} в каждом)`, items: totalTitles })

for (const { name, cache, plan } of plans) {
  console.log(`\n=== ${name}: translating ${plan.length} ===`)
  let done = 0
  for (let i = 0; i < plan.length; i += BATCH) {
    const chunk = plan.slice(i, i + BATCH)
    const en = await callAI(chunk.map(p => p.ru))
    chunk.forEach((p, k) => {
      const title = clean(en[k])
      if (!title) return
      cache[p.id] = { ...(cache[p.id] || {}), 'SEO:Title': title }
    })
    done += chunk.length
    if (done % 90 === 0 || i + BATCH >= plan.length) console.log(`  ${done}/${plan.length}`)
  }
  if (plan.length) {
    await sb.storage.from('feeds').upload(`_translations-${name}.json`, JSON.stringify(cache), { contentType: 'application/json', upsert: true })
    console.log(`  uploaded _translations-${name}.json (${Object.keys(cache).length} rows)`)
  }
}
console.log('\nDONE')
