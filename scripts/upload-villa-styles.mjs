// Uploads scripts/out/_villa-styles.json to Supabase Storage as
// villa-photos/_styles.json so the catalog filter and detail pages
// can fetch it via the public URL.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const local = 'scripts/out/_villa-styles.json'
const json = fs.readFileSync(local, 'utf8')
const payload = Buffer.from(json, 'utf8')

const { error } = await sb.storage.from('villa-photos').upload('_styles.json', payload, {
  contentType: 'application/json',
  cacheControl: '600',
  upsert: true,
})
if (error) { console.error('upload failed:', error.message); process.exit(1) }
console.log('uploaded → villa-photos/_styles.json (' + payload.length + ' bytes)')
