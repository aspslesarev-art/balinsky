import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
for (const tbl of ['raw_villas', 'raw_villy', 'raw_houses', 'raw_homes', 'raw_property', 'raw_real_estate', 'raw_objects']) {
  const { error, count } = await sb.from(tbl).select('*', { count: 'exact', head: true })
  if (!error) console.log(`  ${tbl}: ${count} rows`)
  else console.log(`  ${tbl}: ${error.code} - ${error.message?.slice(0, 60)}`)
}
