import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(50)
const pub = data.filter(r => r.data?.['Опубликовать'] === true)
// pick the richest published row
const richest = pub.reduce((best, r) => Object.keys(r.data || {}).length > best.n ? { n: Object.keys(r.data).length, r } : best, { n: 0, r: null })

const r = richest.r
const fields = [
  'id', 'external_id', 'address', 'currency', 'country_code',
  'user_name', 'user_surname', 'user_email', 'user_phone', 'user_avatar_url', 'seller_info',
  'Цена', 'price', 'Прежняя цена', 'Old price', 'Старая цена',
  'Geo', 'Geo 2', 'lat', 'lang',
  'SEO:Slug', 'SEO:Title', 'SEO:Description', 'SEO Text', 'SEO_Title_EN',
  'Имя ENG', 'Name', 'ИИ Имя', 'Notes',
  'Year of completion', 'Статус', 'Разрешение',
  'Комнаты', 'Площадь', 'Земля',
  'Location', 'Location 2', 'Location filter',
  'Type', 'Developer', 'Developer1',
  'photos', 'Opt photos',
]
for (const k of fields) {
  const v = r.data[k]
  if (v == null) continue
  const out = JSON.stringify(v)
  console.log(`${k.padEnd(22)}: ${out.length > 200 ? out.slice(0, 200) + '...' : out}`)
}
