#!/usr/bin/env node
// Загрузка вилл по районам из нашего ежедневного сбора Booking (миграция 096,
// вьюха booking_occ_single_daily) → lib/district-occupancy.json.
// Считаем только одиночные виллы и только ночи, которые хоть раз были открыты
// для брони: занятость = «была свободна → закрылась» / все открытые ночи.
// Окно — последние WINDOW ночей, но не раньше, чем через 14 дней после старта
// сбора (13.10.2026): у ранних ночей мы не видели, свободны ли они были.
// Запуск раз в месяц вместе с build-market-index: node scripts/build-district-occupancy.mjs
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
const WINDOW = 30
const MIN_START = '2026-10-27'
const MIN_UNITS = 10 // меньше вилл в зоне — цифру не показываем

const day = (d) => d.toISOString().slice(0, 10)
const to = new Date(Date.now() - 86400000) // вчера: сегодняшняя ночь ещё меняется
const fromD = new Date(Math.max(to.getTime() - (WINDOW - 1) * 86400000, Date.parse(MIN_START)))
const from = day(fromD), till = day(to)
const nights = Math.round((to - fromD) / 86400000) + 1

const rows = []
for (let off = 0; ; off += 1000) {
  const q = `${URL_}/rest/v1/booking_occ_single_daily?select=night,zone,booked,free&unit_kind=eq.villa&night=gte.${from}&night=lte.${till}&order=night,zone&limit=1000&offset=${off}`
  const r = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  const page = await r.json()
  if (!Array.isArray(page)) throw new Error(JSON.stringify(page))
  rows.push(...page)
  if (page.length < 1000) break
}
if (rows.length === 0) throw new Error('нет данных за окно — файл не трогаю')

const z = {}
for (const x of rows) {
  const a = (z[x.zone] ??= { booked: 0, open: 0 })
  a.booked += x.booked
  a.open += x.booked + x.free
}
const zones = {}
for (const [name, a] of Object.entries(z)) {
  const units = Math.round(a.open / nights)
  if (units < MIN_UNITS || name === 'Прочее') continue
  zones[name] = { occupancyPct: Math.round((1000 * a.booked) / a.open) / 10, villas: units }
}
const out = { from, to: till, nights, source: 'Balinsky daily Booking.com availability tracking (single-unit villas)', generatedAt: new Date().toISOString(), zones }
fs.writeFileSync('lib/district-occupancy.json', JSON.stringify(out, null, 1) + '\n')
console.log(`${from} → ${till} (${nights} ночей), зон: ${Object.keys(zones).length}`)
for (const [k, v] of Object.entries(zones)) console.log(' ', k, v.occupancyPct + '%', v.villas)
