// Большие дороги, мечети и полоса аэропорта по Бали из OpenStreetMap — для
// оценки шума в «Для жизни» (lib/living-geo.ts). Пишет компактный файл в
// Storage: competitors/_osm_noise.json. Бесплатно (Overpass API); данные
// меняются редко — перезапускать раз в несколько месяцев.
//
//   node scripts/osm-noise.mjs
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
const BBOX = '-8.95,114.40,-8.05,115.75'
const OVERPASS = 'https://overpass-api.de/api/interpreter'

async function overpass(q) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(OVERPASS, { method: 'POST', headers: { 'User-Agent': 'balinsky-research/1.0' }, body: new URLSearchParams({ data: q }) })
    if (r.ok) return r.json()
    console.error('overpass', r.status, '— повтор через 40 с')
    await new Promise(res => setTimeout(res, 40_000))
  }
  throw new Error('overpass unavailable')
}

const CLS = { motorway: 'big', trunk: 'big', primary: 'big', secondary: 'mid' }
const r5 = x => Math.round(x * 1e5) / 1e5

const roads = await overpass(`[out:json][timeout:180];way["highway"~"^(motorway|trunk|primary|secondary)$"](${BBOX});out geom;`)
const mosques = await overpass(`[out:json][timeout:120];nwr["amenity"="place_of_worship"]["religion"="muslim"](${BBOX});out center;`)
const runway = await overpass('[out:json][timeout:60];way["aeroway"="runway"](-8.80,115.10,-8.70,115.20);out geom;')

const rw = runway.elements[0]?.geometry
if (!rw?.length) throw new Error('runway not found')
const out = {
  source: 'OpenStreetMap contributors, ODbL',
  fetched: new Date().toISOString().slice(0, 10),
  roads: roads.elements.filter(e => CLS[e.tags?.highway] && e.geometry).map(e => [CLS[e.tags.highway], e.geometry.map(p => [r5(p.lat), r5(p.lon)])]),
  mosques: mosques.elements.map(e => e.center ?? e).filter(p => p.lat != null).map(p => [r5(p.lat), r5(p.lon)]),
  runway: [[rw[0].lat, rw[0].lon], [rw.at(-1).lat, rw.at(-1).lon]],
}
if (out.roads.length < 1000) throw new Error(`only ${out.roads.length} roads — not writing`)
const r = await fetch(`${URL}/storage/v1/object/competitors/_osm_noise.json`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'x-upsert': 'true' },
  body: JSON.stringify(out),
})
if (!r.ok) throw new Error(`upload ${r.status} ${await r.text()}`)
console.log(`roads ${out.roads.length}, mosques ${out.mosques.length}, runway ok`)
