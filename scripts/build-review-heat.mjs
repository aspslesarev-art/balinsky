// Слой «Карта иностранных туристов» для страниц вилл и апартаментов
// (components/TouristHeatMap.tsx, владелец 23.10.2026): где много мест
// с высокой оценкой и большим числом отзывов в Google.
//
// Почему не _heat_tourists.json (scripts/build-tourist-heat.mjs): там
// выкинуты места с 300+ отзывами — у крупного места всегда найдутся отзывы
// на индонезийском, и оценка «для местных» у них ложная (Penny Lane в Чангу,
// 7 тыс. отзывов, записан «местным»). Из-за этого Санур выглядел пустым.
//
// Здесь место идёт в слой, если: оценка ≥ MIN_RATING, отзывов ≥ MIN_REVIEWS,
// и оно не «местное» по надёжной оценке (≤ 300 отзывов). Дешёвые варунги —
// мимо. Вес — log10(число отзывов): тысяча отзывов весит втрое больше десяти,
// а не в сто раз, чтобы пара гигантов не гасила всё вокруг.
//
// Usage: node scripts/build-review-heat.mjs [--dry]
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

const DRY = process.argv.includes('--dry')
const OUT_KEY = '_heat_reviews.json'
const CELL = 0.0045 // ~0.5 км, та же сетка, что у других слоёв
export const MIN_RATING = 4.3
export const MIN_REVIEWS = 50

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('bali_places')
    .select('lat,lng,rating,user_rating_count,tourist_grade,price_level')
    .gte('rating', MIN_RATING).gte('user_rating_count', MIN_REVIEWS)
    .gte('lat', -8.95).lte('lat', -8.02).gte('lng', 114.4).lte('lng', 115.8)
    .order('id', { ascending: true }).range(from, from + 999)
  if (error) throw new Error(`bali_places read failed: ${error.message}`)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}

const grid = new Map()
let used = 0
for (const p of rows) {
  const n = Number(p.user_rating_count)
  if (p.price_level === 'PRICE_LEVEL_INEXPENSIVE') continue
  if (p.tourist_grade === 'local' && n <= 300) continue
  used++
  const k = `${Math.round(p.lat / CELL)}:${Math.round(p.lng / CELL)}`
  let c = grid.get(k)
  if (!c) { c = { latSum: 0, lngSum: 0, weight: 0, n: 0 }; grid.set(k, c) }
  c.latSum += Number(p.lat); c.lngSum += Number(p.lng); c.weight += Math.log10(n); c.n++
}
const cells = [...grid.values()].map(c => ({ lat: +(c.latSum / c.n).toFixed(5), lng: +(c.lngSum / c.n).toFixed(5), weight: +c.weight.toFixed(2) }))
const sorted = cells.map(c => c.weight).sort((a, b) => a - b)
// p92, а не максимум: одна клетка-выброс иначе сделала бы бледным всё остальное.
const max = Math.max(1, sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.92)] : 1)
console.log(`места: ${rows.length}, в слое: ${used}, клеток: ${cells.length}, max(p92): ${max}`)
const sanur = cells.filter(c => c.lat > -8.73 && c.lat < -8.64 && c.lng > 115.23 && c.lng < 115.29)
console.log(`Санур: ${sanur.length} клеток, самые сильные: ${sanur.map(c => c.weight).sort((a, b) => b - a).slice(0, 8).join(', ')}`)
if (DRY) process.exit(0)
const { error } = await sb.storage.from('competitors').upload(OUT_KEY, Buffer.from(JSON.stringify({ generatedAt: new Date().toISOString(), source: 'bali_places rating+reviews', minRating: MIN_RATING, minReviews: MIN_REVIEWS, cells, max })), { contentType: 'application/json', upsert: true, cacheControl: '3600' })
if (error) { console.error(`upload failed: ${error.message}`); process.exit(1) }
console.log(`uploaded competitors/${OUT_KEY}`)
