// Build the "where foreigners actually hang out" heat layer.
//
// The old layer (_heat_pois.json, scripts/build-heat-pois.mjs) was density of
// tourist-ish POIs weighted by review count — which mostly drew a map of where
// Google has many places at all, so Denpasar glowed as brightly as Canggu.
// This one weighs each venue by WHO reviews it: bali_places.tourist_grade,
// derived from asking Google for reviews twice, once preferring English and
// once Indonesian (migrations 052-054).
//
// Only venues with >= 10 ratings count — the grade is meaningless below that,
// and it is only trustworthy under ~300 ratings anyway (a huge place always has
// five Indonesian reviews). Popularity is deliberately NOT part of the weight:
// this map answers "is the crowd here foreign", not "is it busy".
//
// Usage: node scripts/build-tourist-heat.mjs [--dry]
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const DRY = process.argv.includes('--dry')
const BUCKET = 'competitors'
const OUT_KEY = '_heat_tourists.json'
const CELL = 0.0045                    // ~0.5 km, same grid as the old layer
const GRADE_WEIGHT = { tourist_only: 1, tourist_mostly: 0.6, mixed: 0.25, local: 0 }

async function loadPlaces() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('bali_places')
      .select('lat,lng,tourist_grade,user_rating_count')
      .not('tourist_grade', 'is', null)
      // Below 10 ratings the grade is noise; above ~300 it is an artifact —
      // any big venue has five Indonesian reviews and reads as "local", so
      // including it would quietly punish areas full of famous places.
      .gte('user_rating_count', 10)
      .lte('user_rating_count', 300)
      .gte('lat', -8.95).lte('lat', -8.02)
      .gte('lng', 114.4).lte('lng', 115.8)
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`bali_places read failed: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

const places = await loadPlaces()
const grid = new Map()

for (const p of places) {
  const w = GRADE_WEIGHT[p.tourist_grade] ?? 0
  if (!w || p.lat == null || p.lng == null) continue
  const k = `${Math.round(p.lat / CELL)}:${Math.round(p.lng / CELL)}`
  let cell = grid.get(k)
  if (!cell) { cell = { latSum: 0, lngSum: 0, weight: 0, n: 0 }; grid.set(k, cell) }
  cell.latSum += p.lat; cell.lngSum += p.lng; cell.weight += w; cell.n++
}

const cells = [...grid.values()].map(c => ({
  lat: +(c.latSum / c.n).toFixed(5),
  lng: +(c.lngSum / c.n).toFixed(5),
  weight: +c.weight.toFixed(2),
}))

// p92 rather than the maximum: one outlier cell would otherwise flatten the
// whole ramp to blue. Same convention as the old builder.
const sorted = cells.map(c => c.weight).sort((a, b) => a - b)
const max = Math.max(1, sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.92)] : 1)

const payload = { generatedAt: new Date().toISOString(), source: 'bali_places.tourist_grade', cells, max }

console.log(`graded venues: ${places.length}  → cells: ${cells.length}  max(p92): ${max}`)
console.log(`  top cells: ${[...cells].sort((a, b) => b.weight - a.weight).slice(0, 3).map(c => `${c.lat},${c.lng}=${c.weight}`).join('  ')}`)
if (DRY) process.exit(0)

const { error } = await sb.storage.from(BUCKET).upload(OUT_KEY, Buffer.from(JSON.stringify(payload)), {
  contentType: 'application/json', upsert: true, cacheControl: '3600',
})
if (error) { console.error(`upload failed: ${error.message}`); process.exit(1) }
console.log(`uploaded ${BUCKET}/${OUT_KEY}`)
