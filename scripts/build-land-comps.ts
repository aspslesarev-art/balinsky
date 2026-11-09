// Цены на землю → Storage `rental/land_comps/` — квадраты 0.05° и оглавление.
// Формат: [lat, lng, priceUsd, landM2, tenure(0|1|null), leaseYears|null, url, district]
//
//   npx tsx --env-file=.env.local scripts/build-land-comps.ts [--dry]

// @ts-expect-error -- node:sqlite есть в Node 22+
import { DatabaseSync } from 'node:sqlite'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { CURRENCY_RATES } from '../lib/currency'

const DRY = process.argv.includes('--dry')
const DIR = join(homedir(), 'rumah123-parser/data')
const IDR_PER_USD = CURRENCY_RATES.IDR

type LandItem = [number, number, number, number, 0 | 1 | null, number | null, string, string | null]

const items: LandItem[] = []
const seen = new Set<string>()

// ── Rumah123 ──
const db = new DatabaseSync(join(DIR, 'rumah123.sqlite'), { readOnly: true })
const rows = db.prepare(`
  select cast(price_idr as real) as price_idr, land_m2, certificate, lat, lng, url, district
  from listings
  where type = 'tanah' and deal = 'sale' and price_idr > 0
    and land_m2 > 20 and land_m2 < 100000
    and lat is not null and lng is not null
`).all() as { price_idr: number; land_m2: number; certificate: string | null; lat: number; lng: number; url: string | null; district: string | null }[]

let fromR123 = 0
for (const r of rows) {
  const usd = Math.round(r.price_idr / IDR_PER_USD)
  if (usd < 1000 || usd > 10e6) continue
  const ppm = usd / r.land_m2
  if (ppm < 5 || ppm > 10000) continue
  const inBali = r.lat > -8.95 && r.lat < -8.05 && r.lng > 114.4 && r.lng < 115.75
  if (!inBali) continue
  const key = `${r.district}|${Math.round(r.land_m2)}|${Math.round(usd / 1000)}`
  if (seen.has(key)) continue
  seen.add(key)
  const ten: 0 | 1 | null = r.certificate === 'SHM' ? 0 : r.certificate === 'Hak Sewa' ? 1 : null
  items.push([
    Number(Number(r.lat).toFixed(5)), Number(Number(r.lng).toFixed(5)),
    usd, Math.round(r.land_m2), ten, null, r.url ?? '', r.district,
  ])
  fromR123++
}
console.log(`Rumah123: ${fromR123} участков`)

// ── Новые источники ──
const newPath = join(__dirname, '../data/new_sources_villas.json')
let fromNew = 0
if (existsSync(newPath)) {
  type NewItem = {
    id: string; type: string; tenure: string; area: string; lat: number | null; lng: number | null
    land_sqm: number | null; building_sqm: number | null; bedrooms: number | null
    lease_years: number | null; price_usd: number | null; total_price_idr: number | null
    url: string; name: string; source: string
  }
  const newItems: NewItem[] = JSON.parse(readFileSync(newPath, 'utf8'))
  for (const n of newItems) {
    const isLand = n.type === 'land' || (n.name?.toLowerCase().includes('land') && !n.bedrooms)
    if (!isLand || !n.lat || !n.lng || !n.land_sqm || n.land_sqm < 20) continue
    const usd = n.price_usd ?? (n.total_price_idr ? Math.round(n.total_price_idr / IDR_PER_USD) : null)
    if (!usd || usd < 1000 || usd > 10e6) continue
    const ppm = usd / n.land_sqm
    if (ppm < 5 || ppm > 10000) continue
    const inBali = n.lat > -8.95 && n.lat < -8.05 && n.lng > 114.4 && n.lng < 115.75
    if (!inBali) continue
    const key = `${n.area}|${Math.round(n.land_sqm)}|${Math.round(usd / 1000)}`
    if (seen.has(key)) continue
    seen.add(key)
    const ten: 0 | 1 | null = n.tenure === 'leasehold' ? 1 : n.tenure === 'freehold' ? 0 : null
    items.push([
      Number(Number(n.lat).toFixed(5)), Number(Number(n.lng).toFixed(5)),
      usd, Math.round(n.land_sqm), ten, n.lease_years, n.url, n.area,
    ])
    fromNew++
  }
  console.log(`Новые источники: ${fromNew} участков`)
}

// ── Тайлы ──
const TILE = 0.05
const tileKey = (lat: number, lng: number) => `${Math.floor(lat / TILE)}_${Math.floor(lng / TILE)}`
const tiles = new Map<string, LandItem[]>()
for (const i of items) {
  const k = tileKey(i[0], i[1])
  tiles.set(k, [...(tiles.get(k) ?? []), i])
}

const index = {
  generatedAt: new Date().toISOString(),
  source: 'rumah123.com + balitecturerealty.com + balivillarealty.com + ppbali.com + villabalisale.com',
  idrPerUsd: IDR_PER_USD,
  fields: ['lat', 'lng', 'priceUsd', 'landM2', 'tenure', 'leaseYears', 'url', 'district'],
  tile: TILE,
  count: items.length,
  tiles: Object.fromEntries([...tiles].map(([k, v]) => [k, v.length])),
}

const freehold = items.filter(i => i[4] === 0).length
const leasehold = items.filter(i => i[4] === 1).length
console.log(`Итого: ${items.length} участков (фрихолд ${freehold}, лизхолд ${leasehold}); ${tiles.size} квадратов`)
if (DRY) process.exit(0)

async function put(name: string, body: unknown) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/rental/land_comps/${name}`
  const key = process.env.SUPABASE_SERVICE_KEY!
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-upsert': 'true', 'cache-control': 'max-age=3600' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`)
}

async function upload() {
  const list = [...tiles]
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(list.slice(i, i + 8).map(([k, v]) => put(`${k}.json`, v)))
  }
  await put('_index.json', index)
  console.log(`Storage: ok, ${list.length} квадратов + оглавление`)
}

void upload()
