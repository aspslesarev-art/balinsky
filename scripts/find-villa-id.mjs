import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const slug = process.argv[2] || 'baliwood-i-pererenan-350m2-4-bedroom'
const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(1000)
for (const r of data ?? []) {
  const s = r.data?.['SEO:Slug']
  const got = (Array.isArray(s) ? s[0] : s)?.value ?? (Array.isArray(s) ? s[0] : s)
  if (got === slug) { console.log(r.airtable_id); break }
}
