import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data } = await sb.from('raw_complexes').select('*').limit(500)
console.log('Total rows:', data?.length)

// Top-level cols
console.log('Top-level columns:', Object.keys(data?.[0] ?? {}))

// All distinct data keys + counts
const keyCount = new Map()
for (const r of data ?? []) {
  for (const k of Object.keys(r.data || {})) {
    keyCount.set(k, (keyCount.get(k) ?? 0) + 1)
  }
}
console.log('\nAll data keys (key → rows containing it):')
for (const [k, v] of [...keyCount.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v.toString().padStart(4)}  ${k}`)
}

// Sample richest row
const richest = (data ?? []).reduce((best, r) => {
  const n = Object.keys(r.data || {}).length
  return n > best.n ? { n, r } : best
}, { n: 0, r: null })
console.log('\nRichest row (truncated 4kb):')
console.log(JSON.stringify(richest.r?.data, null, 2).slice(0, 4000))

// Distribution of likely filter fields
function freq(rows, key, transform = v => v) {
  const m = new Map()
  for (const r of rows) {
    const v = transform(r.data[key])
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue
    const arr = Array.isArray(v) ? v : [v]
    for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

for (const key of ['Статус', 'Разрешительные документы', 'Типы юнитов', 'Year of completion ', 'Year of completion', 'Location 2', 'Developer', 'Цена', 'price_usd']) {
  const f = freq(data ?? [], key)
  if (f.length === 0) continue
  console.log(`\n=== ${key} (top 10) ===`)
  for (const [v, c] of f.slice(0, 10)) console.log(`  ${c.toString().padStart(4)}  ${v}`)
}

// Count by published
console.log('\nPublication:')
console.log('  Публикация===true:', (data ?? []).filter(r => r.data?.['Публикация'] === true).length)
console.log('  Опубликовать===true:', (data ?? []).filter(r => r.data?.['Опубликовать'] === true).length)
