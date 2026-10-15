// «Подтверждённая доходность»: объекты, чей комплекс сам сдаётся на Booking
// (complex_booking_match, миграция 110). Для них калькулятор считает по
// реальной загрузке и цене комплекса, и карточки получают отметку.
//
// Пишет lib/verified-yield.json { complexes, villas, apartments } — список
// маленький и меняется только с таблицей совпадений, поэтому лежит в коде:
// каталог читает его без запросов к базе.
//
//   node scripts/build-verified-yield.mjs
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function all(path) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { ...H, Range: `${from}-${from + 999}` } })
    if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`)
    const rows = await r.json()
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

// Объявление ниже 20% загрузки по сути не работает — такой комплекс не отмечаем.
const MIN_OCC = 20

const matches = await all('complex_booking_match?select=complex_id,booking_id')
const ids = [...new Set(matches.map(m => m.booking_id))]
const locs = await all(`booking_data_locations?select=id,occupancy&id=in.(${ids.join(',')})`)
const live = new Set(locs.filter(l => Number(l.occupancy) >= MIN_OCC).map(l => l.id))
const complexIds = [...new Set(matches.filter(m => live.has(m.booking_id)).map(m => m.complex_id))]

const cx = await all(`raw_complexes?select=airtable_id,p:data->>Project&airtable_id=in.(${complexIds.join(',')})`)
const names = new Set(cx.map(c => String(c.p ?? '').trim().toLowerCase()).filter(Boolean))
const idSet = new Set(complexIds)

// Название комплекса целиком, а не кусок: «oasis ii» не должно находиться в «oasis iii».
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const wholeName = (text, name) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(name)}($|[^\\p{L}\\p{N}])`, 'u').test(text)

// Ссылка «Комплекс» у части юнитов хранит старый id — сверяем ещё по названию.
async function units(table) {
  const rows = await all(`${table}?select=airtable_id,k:data->Комплекс,k1:data->>Комплекс 1,t:data->>%22SEO:Title%22,pub:data->>Опубликовать`)
  // Без ссылки и названия комплекса — по названию комплекса в заголовке
  // (так же делает lib/investment/snapshot.ts).
  const longNames = [...names].filter(n => n.length >= 5)
  return rows.filter(r => r.pub === 'true' && (
    (Array.isArray(r.k) && r.k.some(x => idSet.has(String(x)))) ||
    names.has(String(r.k1 ?? '').trim().toLowerCase()) ||
    longNames.some(n => wholeName(String(r.t ?? '').toLowerCase(), n))
  )).map(r => r.airtable_id).sort()
}

const out = { complexes: complexIds.sort(), villas: await units('raw_villas'), apartments: await units('raw_apartments') }
fs.writeFileSync('lib/verified-yield.json', JSON.stringify(out, null, 1) + '\n')
console.log(`complexes ${out.complexes.length}, villas ${out.villas.length}, apartments ${out.apartments.length}`)
