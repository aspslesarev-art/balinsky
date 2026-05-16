// Post articles from scripts/knowledge-articles.json into the Airtable
// knowledge base. Idempotent — checks existing `Name` field to skip dupes.
// After posting, run:
//   node scripts/sync-knowledge.mjs
//   node scripts/translate-missing-en.mjs knowledge
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const TOKEN = process.env.AIRTABLE_TOKEN
const BASE = 'apprLayx1J75RvP95'
const TABLE = 'tblE1XTsYrH29f7QC'

if (!TOKEN) throw new Error('AIRTABLE_TOKEN missing')

const articles = JSON.parse(fs.readFileSync('scripts/knowledge-articles.json', 'utf8'))

async function fetchAll() {
  const out = []
  let offset
  for (let i = 0; i < 200; i++) {
    const u = new URL(`https://api.airtable.com/v0/${BASE}/${TABLE}`)
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

const existing = await fetchAll()
const existingNames = new Set(existing.map(r => (r.fields?.Name || '').trim()).filter(Boolean))
console.log(`existing records in Airtable: ${existing.length}, with Name: ${existingNames.size}`)

const toCreate = articles.filter(a => !existingNames.has(a.name.trim()))
console.log(`new articles to create: ${toCreate.length}`)
if (toCreate.length === 0) { console.log('nothing to do'); process.exit(0) }

// Airtable batch create: max 10 records per request
const created = []
for (let i = 0; i < toCreate.length; i += 10) {
  const batch = toCreate.slice(i, i + 10)
  const body = {
    records: batch.map(a => ({ fields: { Name: a.name, Notes: a.notes } })),
    typecast: false,
  }
  const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!r.ok) {
    console.error(`✗ batch ${i / 10 + 1} failed:`, JSON.stringify(j, null, 2))
    process.exit(1)
  }
  for (const rec of j.records) {
    console.log(`  ✓ ${rec.id}  ${rec.fields.Name.slice(0, 80)}`)
    created.push(rec)
  }
}

console.log(`\ncreated ${created.length} records`)
console.log('next steps:')
console.log('  1. node scripts/sync-knowledge.mjs')
console.log('  2. node scripts/translate-missing-en.mjs knowledge')
