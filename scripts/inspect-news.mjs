import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }

const BASE = 'appjkxFu5bu0Zi08J'
const TOKEN = process.env.AIRTABLE_TOKEN

// Discover tables
const meta = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
})
if (!meta.ok) {
  console.error('meta error:', meta.status, await meta.text())
  process.exit(1)
}
const j = await meta.json()
console.log('Tables in base:')
for (const t of j.tables) {
  console.log('  -', t.id, '·', t.name, '· fields:', t.fields.length)
}
console.log('\n---\n')

for (const t of j.tables) {
  console.log(`\n=== ${t.name} (${t.id}) ===`)
  console.log('Fields:')
  for (const f of t.fields) console.log(`  ${f.name}  [${f.type}]`)
  // Get 2 sample records
  const r = await fetch(`https://api.airtable.com/v0/${BASE}/${t.id}?pageSize=2`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (r.ok) {
    const d = await r.json()
    console.log(`Sample (${d.records.length}):`)
    for (const rec of d.records) {
      console.log(' ', JSON.stringify(rec.fields, null, 2).slice(0, 1200))
    }
  }
}
