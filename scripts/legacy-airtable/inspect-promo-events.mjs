import './_retired.mjs'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }

const TOKEN = process.env.AIRTABLE_TOKEN
const BASES = [
  ['Акции', 'apphPlibFL8GKhQKS'],
  ['Мероприятия', 'appaKbszqXLnvoVKK'],
]

for (const [label, base] of BASES) {
  console.log(`\n========== ${label} (${base}) ==========`)
  const meta = await fetch(`https://api.airtable.com/v0/meta/bases/${base}/tables`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!meta.ok) { console.log('META ERROR', meta.status); continue }
  const j = await meta.json()
  for (const t of j.tables) {
    console.log(`-- ${t.name} (${t.id}) — ${t.fields.length} fields`)
    for (const f of t.fields) console.log(`   ${f.name}  [${f.type}]`)
    const r = await fetch(`https://api.airtable.com/v0/${base}/${t.id}?pageSize=2`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (r.ok) {
      const d = await r.json()
      console.log(`   --- sample (${d.records.length}) ---`)
      for (const rec of d.records) {
        console.log('   ', JSON.stringify(rec.fields, null, 2).slice(0, 1000))
      }
    }
  }
}
