// Виллы на продаже вокруг объекта → Storage `rental/sale_comps/` — квадраты
// 0.05° (~5.5 км) `<lat>_<lng>.json` и оглавление `_index.json`. Весь Бали —
// 4+ МБ, а странице нужны только соседние квадраты.
//
// Источник — собранная база rumah123.com (~/rumah123-parser): объявления
// продажи вилл плюс продажи лизхолда, которые агенты выставили как «аренду
// в год» (2 млрд IDR «/tahun» за 24 года). Полные описания лизхолдов —
// из data/leasehold.sqlite (details.py), из них берём срок.
// Питает блок «Что продаётся рядом» на странице виллы (lib/sale-comps.ts).
//
//   npx tsx --env-file=.env.local scripts/build-sale-comps.ts [--dry]
//
// Бесплатно: только чтение локальных баз и одна запись в Storage.

// @ts-expect-error -- node:sqlite есть в Node 22+, а в @types/node проекта его ещё нет
import { DatabaseSync } from 'node:sqlite'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CURRENCY_RATES } from '../lib/currency'

const DRY = process.argv.includes('--dry')
const DIR = join(homedir(), 'rumah123-parser/data')
const IDR_PER_USD = CURRENCY_RATES.IDR
const YEAR_NOW = new Date().getFullYear()

type Row = {
  id: string; deal: string; rent_period: string | null; price_idr: number; bedrooms: number
  building_m2: number | null; land_m2: number | null; certificate: string | null
  lat: number; lng: number; posted: string | null; url: string | null; title: string | null
  district: string | null; photo_url: string | null; description: string | null
}

const LEASE_WORD = /leas?e? ?hold|long ?lease|hak sewa|sewa panjang/i
const FREE_WORD = /free ?hold|hak milik/i
const YEARS_RES = [
  /leas?e? ?hold[^.\d]{0,25}?(\d{2}(?:[.,]5)?)\s*(?:\+\s*\d+\s*)?(?:years?|yrs?|tahun|thn|th)\b/i,
  /(\d{2}(?:[.,]5)?)\s*(?:\+\s*\d+\s*)?[- ]?(?:years?|yrs?|tahun|thn|th)[- ]*(?:of\s+)?(?:lease|hak sewa)/i,
  /hak sewa[^.\d]{0,20}?(\d{2})\s*(?:tahun|thn|th)\b/i,
]
const UNTIL_YEAR = /(?:until|till|valid until|expir\w*|sampai|hingga|s\/d)\s+(?:\w+\s+){0,3}(20[3-9]\d|21\d\d)/i
// Тот же порог, что в build-longterm-rent-comps.ts: «аренда в год» дороже
// 450 млн IDR на спальню — это цена всего лизхолда.
const YEAR_PRICE_PER_BED_MAX_IDR = 450e6

function leaseYears(text: string): number | null {
  for (const re of YEARS_RES) {
    const m = text.match(re)
    if (m) {
      const y = Number(m[1].replace(',', '.'))
      if (y >= 5 && y <= 99) return y
    }
  }
  const u = text.match(UNTIL_YEAR)
  if (u && LEASE_WORD.test(text)) {
    const y = Number(u[1]) - YEAR_NOW
    if (y >= 3 && y <= 99) return y
  }
  return null
}

/** 1 — лизхолд, 0 — фрихолд, null — не понять. */
function tenure(text: string, certificate: string | null, years: number | null): 0 | 1 | null {
  const l = LEASE_WORD.test(text), f = FREE_WORD.test(text)
  if (certificate === 'Hak Sewa' || years != null || (l && !f)) return 1
  if (l && f) return null
  if (f || certificate === 'SHM') return 0
  return null
}

const db = new DatabaseSync(join(DIR, 'rumah123.sqlite'), { readOnly: true })
const rows = db.prepare(`
  select id, deal, rent_period, price_idr, bedrooms, building_m2, land_m2, certificate,
         lat, lng, posted, url, title, district, photo_url, description
  from listings
  where type = 'villa' and price_idr > 0 and lat is not null and lng is not null
    and bedrooms between 1 and 8
    and (deal = 'sale' or (deal = 'rent' and rent_period = 'year'))
`).all() as unknown as Row[]

const full = new Map<string, string>()
const lhPath = join(DIR, 'leasehold.sqlite')
if (existsSync(lhPath)) {
  const lh = new DatabaseSync(lhPath, { readOnly: true })
  for (const r of lh.prepare('select id, description from details where description is not null').all() as { id: string; description: string }[]) {
    full.set(r.id, r.description)
  }
}

const seen = new Set<string>()
const items: (string | number | null)[][] = []
let fromRent = 0, skipped = 0
for (const r of rows) {
  const text = `${r.title ?? ''} . ${full.get(r.id) ?? r.description ?? ''}`
  if (r.deal === 'rent') {
    // Из «аренды» берём только явные продажи лизхолда.
    const sale = LEASE_WORD.test(text) || r.price_idr > YEAR_PRICE_PER_BED_MAX_IDR * r.bedrooms
    if (!sale) continue
  }
  const usd = Math.round(r.price_idr / IDR_PER_USD)
  const m2 = r.building_m2 && r.building_m2 >= 25 && r.building_m2 <= 2000 ? Math.round(r.building_m2) : null
  const inBali = r.lat > -8.95 && r.lat < -8.05 && r.lng > 114.4 && r.lng < 115.75
  // $/м² вне 300–15 000 — опечатки в цене или площади.
  const ppm = m2 ? usd / m2 : null
  if (!inBali || usd < 20000 || usd > 20e6 || (ppm != null && (ppm < 300 || ppm > 15000))) { skipped++; continue }
  // Одну виллу выставляют несколько агентов — схлопываем.
  const key = `${r.district}|${r.bedrooms}|${m2}|${Math.round(usd / 1000)}`
  if (seen.has(key)) { skipped++; continue }
  seen.add(key)
  const years = leaseYears(text)
  const ten = tenure(text, r.certificate, years)
  if (r.deal === 'rent') fromRent++
  items.push([
    Number(r.lat.toFixed(5)), Number(r.lng.toFixed(5)), r.bedrooms, usd, m2,
    r.land_m2 && r.land_m2 > 20 ? Math.round(r.land_m2) : null,
    ten, years, r.posted,
    (r.url ?? '').replace('https://www.rumah123.com', ''),
    (r.photo_url ?? '').replace('https://picture.rumah123.com/r123-images/', '') || null,
    r.district,
  ])
}

const TILE = 0.05
const tileKey = (lat: number, lng: number) => `${Math.floor(lat / TILE)}_${Math.floor(lng / TILE)}`
const tiles = new Map<string, typeof items>()
for (const i of items) {
  const k = tileKey(i[0] as number, i[1] as number)
  tiles.set(k, [...(tiles.get(k) ?? []), i])
}

const asOf = items.reduce((mx, i) => (typeof i[8] === 'string' && i[8] > mx ? i[8] : mx), '')
const index = {
  generatedAt: new Date().toISOString(),
  asOf: asOf || null,
  source: 'rumah123.com',
  idrPerUsd: IDR_PER_USD,
  urlBase: 'https://www.rumah123.com',
  photoBase: 'https://picture.rumah123.com/r123-images/',
  fields: ['lat', 'lng', 'bedrooms', 'priceUsd', 'buildingM2', 'landM2', 'tenure', 'leaseYears', 'posted', 'url', 'photo', 'district'],
  tile: TILE,
  count: items.length,
  tiles: Object.fromEntries([...tiles].map(([k, v]) => [k, v.length])),
}
const lease = items.filter(i => i[6] === 1).length, withYears = items.filter(i => i[7] != null).length
console.log(`строк ${rows.length}, в выгрузку ${items.length} (из «аренды» ${fromRent}), отброшено ${skipped}; лизхолд ${lease}, со сроком ${withYears}; квадратов ${tiles.size}, самый большой ${(Math.max(...[...tiles.values()].map(v => JSON.stringify(v).length)) / 1024).toFixed(0)} КБ`)
if (DRY) process.exit(0)

async function put(name: string, body: unknown) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/rental/sale_comps/${name}`
  const key = process.env.SUPABASE_SERVICE_KEY!
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-upsert': 'true', 'cache-control': 'max-age=3600' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`)
}

async function upload() {
  // Сначала квадраты, оглавление последним — чтобы оно не ссылалось на ещё не залитое.
  const list = [...tiles]
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(list.slice(i, i + 8).map(([k, v]) => put(`${k}.json`, v)))
  }
  await put('_index.json', index)
  console.log(`Storage: ok, ${list.length} квадратов + оглавление`)
}

void upload()
