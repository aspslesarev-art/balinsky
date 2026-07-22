import './_retired.mjs'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }

console.log('--- Supabase: looking for Aggregator-like fields ---')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(2000)
const fieldFreq = new Map()
for (const r of data) {
  for (const k of Object.keys(r.data || {})) {
    if (/aggregator|export|realting|агрегатор/i.test(k)) {
      fieldFreq.set(k, (fieldFreq.get(k) || 0) + 1)
    }
  }
}
console.log('Supabase aggregator fields seen:')
for (const [k, n] of fieldFreq) console.log(`  ${k}  (in ${n} rows)`)

console.log('\n--- Airtable: live check ---')
const TOKEN = process.env.AIRTABLE_TOKEN
const BASE = 'appAwgCAwOIQs2DJh'
const TABLE = 'tblRD00AhDNrpW3DA'
const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}?pageSize=20`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
})
const j = await r.json()
const allFields = new Set()
for (const rec of j.records ?? []) {
  for (const k of Object.keys(rec.fields ?? {})) allFields.add(k)
}
console.log('Airtable aggregator-like fields:')
for (const k of allFields) {
  if (/aggregator|export|realting|агрегатор/i.test(k)) console.log('  ' + k)
}
console.log('\nAll Airtable fields (first 30):')
console.log([...allFields].sort().slice(0, 30))
