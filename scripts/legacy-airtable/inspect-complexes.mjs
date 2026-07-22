import './_retired.mjs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// 1. Probe a bunch of likely table names
const candidates = [
  'raw_complexes', 'raw_complex', 'raw_projects', 'raw_project',
  'raw_buildings', 'raw_residential', 'raw_residences', 'raw_zhk',
  'complexes', 'projects', 'buildings', 'residences',
  'listings_view', 'raw_listings', 'raw_developers',
]
console.log('=== probing tables ===')
for (const t of candidates) {
  const { error, count } = await sb.from(t).select('*', { count: 'exact', head: true })
  if (!error) console.log(`  ${t}: ${count} rows`)
}

// 2. Sample one listing to see if it references a complex
console.log('\n=== listings_view sample columns ===')
const { data: l } = await sb.from('listings_view').select('*').limit(1)
if (l?.[0]) console.log(Object.keys(l[0]))

// 3. Check raw_developers data row for any complex-related keys
console.log('\n=== raw_developers sample keys ===')
const { data: d } = await sb.from('raw_developers').select('data').limit(1)
if (d?.[0]) {
  const keys = Object.keys(d[0].data)
  console.log(keys.filter(k => /complex|project|building|жк|комплекс|residen/i.test(k)))
}

// 4. List all Airtable bases via meta endpoint
console.log('\n=== Airtable bases visible to token ===')
const mr = await fetch('https://api.airtable.com/v0/meta/bases', {
  headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
})
const mj = await mr.json()
console.log('status:', mr.status)
for (const b of mj.bases ?? []) console.log(` ${b.id}  ${b.name}  (permission=${b.permissionLevel})`)

// 5. List tables in the developers base (might contain complexes too)
console.log('\n=== tables in applhWe0pCVRue9QC ===')
const tr = await fetch('https://api.airtable.com/v0/meta/bases/applhWe0pCVRue9QC/tables', {
  headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
})
const tj = await tr.json()
console.log('status:', tr.status)
for (const t of tj.tables ?? []) console.log(` ${t.id}  ${t.name}  (fields=${t.fields?.length})`)
