import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

console.log('Testing DB:')
const t0 = Date.now()
const { data, error } = await sb.from('raw_villas').select('airtable_id').limit(1)
console.log('  DB:', error ? `ERR ${error.message}` : 'OK', `(${Date.now()-t0}ms)`, data?.length, 'rows')

console.log('Testing storage list:')
const t1 = Date.now()
const r = await sb.storage.listBuckets()
console.log('  Buckets:', r.error ? `ERR ${r.error.message}` : `${r.data?.length} buckets`, `(${Date.now()-t1}ms)`)
