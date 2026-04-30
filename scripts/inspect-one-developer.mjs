import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data } = await sb.from('raw_developers').select('*').limit(70)
const pub = data.filter(r => r.data?.['Публикация'] === true)
console.log('total dev rows:', data.length, 'published:', pub.length)

// pick the richest
const richest = pub.reduce((best, r) => Object.keys(r.data || {}).length > best.n ? { n: Object.keys(r.data).length, r } : best, { n: 0, r: null })
console.log('\n=== richest dev ===')
console.log('top-level columns:', Object.keys(richest.r))
console.log('slug:', richest.r.data['SEO:Slug'])
console.log('name:', richest.r.data['Developer'])
console.log('all data keys:', Object.keys(richest.r.data || {}).sort())

// distribution of useful fields
const fields = ['Developer', 'SEO:Slug', 'Logo', 'AI Описание', 'Описание ИИ', 'ИИ Описание', 'AI Описание развернутое',
  'Общий рейтинг', 'Rating of developer2', 'Комиссия', 'Комиссия отображение', 'Год основания',
  'Сайт', 'Telegram', 'WhatsApp', 'Number of projects', 'Total projects', 'Project count',
  'Строительство и недвижимость', 'Репутация и опыт', 'Техника и производство', 'Управляющая компания',
  'Команда', 'Бизнес и сервисы', 'Доходность', 'Текст голосования']
console.log('\n=== field presence ===')
for (const f of fields) {
  const c = data.filter(r => r.data[f] != null && r.data[f] !== '').length
  if (c > 0) console.log(`  ${c.toString().padStart(3)}/${data.length}  ${f}`)
}

// sample one richest fully
console.log('\n=== richest dev FULL ===')
console.log(JSON.stringify(richest.r.data, null, 2).slice(0, 4500))
