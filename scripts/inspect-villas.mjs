import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data } = await sb.from('raw_villas').select('*').limit(600)
console.log('Total:', data?.length)
console.log('Top-level columns:', Object.keys(data?.[0] ?? {}))

const keyCount = new Map()
for (const r of data ?? []) for (const k of Object.keys(r.data || {})) keyCount.set(k, (keyCount.get(k) ?? 0) + 1)
console.log('\nAll data keys (top by frequency):')
for (const [k, v] of [...keyCount.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v.toString().padStart(4)}  ${k}`)
}

const richest = (data ?? []).reduce((best, r) => {
  const n = Object.keys(r.data || {}).length
  return n > best.n ? { n, r } : best
}, { n: 0, r: null })
console.log(`\nRichest row keys (${richest.n}):`)
console.log('Sample data (4kb):')
console.log(JSON.stringify(richest.r?.data, null, 2).slice(0, 4000))

function freq(rows, key) {
  const m = new Map()
  for (const r of rows) {
    const v = r.data[key]
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue
    const arr = Array.isArray(v) ? v : [v]
    for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

for (const key of ['Опубликовать', 'Публикация', 'Статус', 'Спальни', 'Bedrooms', 'Тип', 'Type', 'Location filter', 'Location', 'Location 2', 'Цена', 'price_usd', 'Площадь', 'Земля', 'Бассейн']) {
  const f = freq(data ?? [], key)
  if (f.length === 0) continue
  console.log(`\n=== ${key} (top 8) ===`)
  for (const [v, c] of f.slice(0, 8)) console.log(`  ${c.toString().padStart(4)}  ${v}`)
}
