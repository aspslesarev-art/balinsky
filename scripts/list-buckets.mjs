import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data: list } = await sb.storage.listBuckets()
console.log('buckets:', list.map(b => b.name))
for (const b of list) {
  const r = await sb.storage.from(b.name).list('', { limit: 30 })
  console.log(' ', b.name, '→', (r.data || []).slice(0,8).map(o => o.name).join(', '))
}
