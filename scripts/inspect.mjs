import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data: rows, error } = await sb.from('raw_developers').select('*').limit(2)
if (error) throw error

console.log('=== raw_developers columns ===')
console.log(Object.keys(rows[0]))

console.log('\n=== data JSON top-level keys (row 0) ===')
console.log(Object.keys(rows[0].data))

console.log('\n=== Logo shape (row 0) ===')
console.log(JSON.stringify(rows[0].data.Logo, null, 2)?.slice(0, 800))

console.log('\n=== Row 0 non-data columns ===')
const { data: _, ...rest } = rows[0]
console.log(rest)

console.log('\n=== Airtable API sanity check ===')
const base = 'applhWe0pCVRue9QC'
const table = 'tbl6vycdDkqIUOMWw'
const r = await fetch(`https://api.airtable.com/v0/${base}/${table}?maxRecords=2`, {
  headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
})
console.log('HTTP', r.status)
const j = await r.json()
const first = j.records?.[0]
console.log('record id:', first?.id)
console.log('fields keys:', Object.keys(first?.fields ?? {}))
console.log('Logo from Airtable:', JSON.stringify(first?.fields?.Logo, null, 2)?.slice(0, 800))

const url = first?.fields?.Logo?.[0]?.url
if (url) {
  const head = await fetch(url, { method: 'HEAD' })
  console.log('Fresh Airtable URL HEAD:', head.status, head.headers.get('content-type'))
}

console.log('\n=== Supabase rowcount ===')
const { count } = await sb.from('raw_developers').select('*', { count: 'exact', head: true })
console.log('total rows in raw_developers:', count)
