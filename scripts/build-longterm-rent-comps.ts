// Долгосрочная (помесячная) аренда вилл по Бали → Storage `rental/_longterm_comps.json`.
//
// Источник — собранная база rumah123.com (~/rumah123-parser, SQLite): ~13 тыс.
// объявлений аренды вилл с ценой за месяц или год и точкой на карте (у части —
// центр района). Питает помесячный калькулятор доходности для объектов в жилой
// (жёлтой) зоне, где посуточная аренда запрещена (lib/investment/monthly.ts).
//
//   npx tsx --env-file=.env.local scripts/build-longterm-rent-comps.ts [путь к rumah123.sqlite] [--dry]
//
// Бесплатно: только чтение локальной базы и одна запись в Storage.

// @ts-expect-error -- node:sqlite есть в Node 22+, а в @types/node проекта его ещё нет
import { DatabaseSync } from 'node:sqlite'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CURRENCY_RATES } from '../lib/currency'

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const dbPath = args.find(a => !a.startsWith('--')) ?? join(homedir(), 'rumah123-parser/data/rumah123.sqlite')
const IDR_PER_USD = CURRENCY_RATES.IDR
const MONTHS_FRESH = 9

type Row = {
  lat: number; lng: number; bedrooms: number; building_m2: number | null
  rent_month_idr: number; posted: string | null; url: string | null; title: string | null; district: string | null
}

const db = new DatabaseSync(dbPath, { readOnly: true })
const rows = db.prepare(`
  select lat, lng, bedrooms, building_m2, rent_month_idr, posted, url, title, district
  from listings
  where deal = 'rent' and type = 'villa'
    and rent_period in ('month', 'year')
    and rent_month_idr > 0 and lat is not null and lng is not null
    and bedrooms between 1 and 8
`).all() as unknown as Row[]

const cutoff = new Date(Date.now() - MONTHS_FRESH * 30 * 864e5).toISOString().slice(0, 10)
const seen = new Set<string>()
const items: [number, number, number, number, number | null, string | null, string | null, string, string | null][] = []
let skipped = 0
for (const r of rows) {
  const usd = Math.round(r.rent_month_idr / IDR_PER_USD)
  const inBali = r.lat > -8.95 && r.lat < -8.05 && r.lng > 114.4 && r.lng < 115.75
  // $150–30 000 в месяц: ниже — комнаты и опечатки, выше — ошибки в единицах.
  if (!inBali || usd < 150 || usd > 30000 || (r.posted && r.posted < cutoff)) { skipped++; continue }
  const key = `${r.lat.toFixed(4)}|${r.lng.toFixed(4)}|${r.bedrooms}|${Math.round(usd / 10)}`
  if (seen.has(key)) { skipped++; continue }
  seen.add(key)
  items.push([
    Number(r.lat.toFixed(5)), Number(r.lng.toFixed(5)), r.bedrooms, usd,
    r.building_m2 && r.building_m2 > 10 ? Math.round(r.building_m2) : null,
    r.posted, r.url, (r.title ?? '').slice(0, 120), r.district,
  ])
}

// Дата данных — самое свежее объявление, а не день выгрузки.
const asOf = items.reduce((mx, i) => (i[5] && i[5] > mx ? i[5] : mx), '')
const out = {
  generatedAt: new Date().toISOString(),
  asOf: asOf || null,
  source: 'rumah123.com',
  idrPerUsd: IDR_PER_USD,
  fields: ['lat', 'lng', 'bedrooms', 'rentMonthUsd', 'buildingM2', 'posted', 'url', 'title', 'district'],
  count: items.length,
  items,
}
console.log(`строк ${rows.length}, в выгрузку ${items.length}, отброшено ${skipped}; ${(JSON.stringify(out).length / 1024).toFixed(0)} КБ`)
if (DRY) process.exit(0)

async function upload() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/rental/_longterm_comps.json`
  const key = process.env.SUPABASE_SERVICE_KEY!
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-upsert': 'true', 'cache-control': 'max-age=3600' },
    body: JSON.stringify(out),
  })
  console.log('Storage:', res.status, res.ok ? 'ok' : await res.text())
}

void upload()
