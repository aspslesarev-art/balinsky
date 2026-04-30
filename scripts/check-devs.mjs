import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data } = await sb.from('raw_developers').select('airtable_id, data').limit(5)
console.log('rows:', data?.length)
if (data?.[0]) {
  console.log('keys:', Object.keys(data[0].data).slice(0, 30))
  console.log('sample:')
  for (const k of ['Name', 'ИИ Имя', 'Имя ENG', 'SEO:Slug']) {
    console.log(' ', k, '=', JSON.stringify(data[0].data[k]))
  }
}
