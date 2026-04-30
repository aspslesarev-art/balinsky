import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const AIRTABLE_BASE = 'appK9z6iue7wRtEIS'
const AIRTABLE_TABLE = 'Застройщики'
const BUCKET = 'apartment-photos'
const KEY = '_developers.json'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function fetchAirtableAll() {
  const all = []
  let offset
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_TABLE)}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    })
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`)
    const j = await r.json()
    all.push(...j.records)
    offset = j.offset
  } while (offset)
  return all
}

const records = await fetchAirtableAll()
console.log(`developers fetched: ${records.length}`)

const map = {}
for (const rec of records) {
  const f = rec.fields ?? {}
  const name = f['Developer'] ?? f['Developer_key'] ?? null
  if (typeof name === 'string' && name.trim()) {
    map[rec.id] = name.trim()
  }
}
console.log(`with names: ${Object.keys(map).length}`)

const body = Buffer.from(JSON.stringify(map))
const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/json',
  upsert: true,
})
if (error) throw error

const url = sb.storage.from(BUCKET).getPublicUrl(KEY).data.publicUrl
console.log(`saved: ${url}`)
