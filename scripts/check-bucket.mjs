import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data: list, error } = await sb.storage.from('competitors').list('', { limit: 100 })
console.log('list:', list, 'error:', error)

const { data: file, error: dErr } = await sb.storage.from('competitors').download('_competitors.json')
if (dErr) { console.error('download error:', dErr); process.exit(1) }
const text = await file.text()
console.log('downloaded size:', text.length)
const parsed = JSON.parse(text)
console.log('parsed count:', parsed.count, 'items length:', parsed.items?.length)
console.log('sample item:', JSON.stringify(parsed.items?.[0], null, 2))
