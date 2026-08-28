// Чистка столбцов-дублей со ссылкой на Google Maps в raw_complexes + добор
// координат для карты.
//
// Зачем: сетка /admin/data динамическая — она показывает ВСЕ ключи, какие есть
// в JSONB `data`. Поэтому «Добавить поле» с именем вроде «Link from Google
// maps» рождает второй столбец рядом с исторически каноническим
// `Link from Google maps on location`. С lib/admin/fields.ts (правило
// `dedupe`) дубль уже не показывается и его значение переносится на
// канонический ключ при открытии карточки, но в самих данных он остаётся —
// этот скрипт убирает его насовсем.
//
// Заодно закрывает вторую половину проблемы: блок «Локация» с картой на
// странице ЖК выводится ТОЛЬКО при заполненных `Geo` / `Geo 2`, а не по
// ссылке. Скрипт достаёт координаты из ссылки (короткие maps.app.goo.gl
// разворачивает по редиректу) и проставляет их там, где их нет.
//
// Использование:
//   node scripts/fix-complex-map-links.mjs           # сухой прогон, только отчёт
//   node scripts/fix-complex-map-links.mjs --apply   # записать в Supabase
//
// Распознаватель дублей и разбор координат — те же, что у сайта
// (lib/map-link.ts). Меняете там — поправьте и здесь.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const APPLY = process.argv.includes('--apply')
const TABLE = 'raw_complexes'
const MAP_LINK_FIELD = 'Link from Google maps on location'
const LAT_FIELD = 'Geo'
const LNG_FIELD = 'Geo 2'

function loadEnv() {
  const raw = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const out = {}
  for (const line of raw.split('\n')) {
    if (!line.includes('=') || line.trimStart().startsWith('#')) continue
    const i = line.indexOf('=')
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const normalizeKey = (key) => key.toLowerCase().replace(/[^a-zа-я0-9]/g, '')

function isMapLinkKey(key) {
  const k = normalizeKey(key)
  if (!k.includes('google')) return false
  return k.includes('map') || k.includes('карт') || k.includes('мап')
}

function asUrl(v) {
  if (typeof v === 'string') {
    const s = v.trim()
    return /^https?:\/\//i.test(s) ? s : null
  }
  if (Array.isArray(v)) {
    for (const item of v) { const s = asUrl(item); if (s) return s }
    return null
  }
  if (v && typeof v === 'object' && 'value' in v) return asUrl(v.value)
  return null
}

const NUM = String.raw`-?\d+(?:\.\d+)?`
const COORD_RES = [
  new RegExp(String.raw`!3d(${NUM})!4d(${NUM})`),
  new RegExp(String.raw`[?&](?:q|query|ll|sll|center|destination|daddr)=(${NUM})(?:%2C|,)\s*(${NUM})`, 'i'),
  new RegExp(String.raw`@(${NUM}),(${NUM})`),
]

function validPair(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

function mapLinkCoords(url) {
  if (!url) return null
  const s = String(url)
  for (const re of COORD_RES) {
    const m = s.match(re)
    if (m) { const pair = validPair(Number(m[1]), Number(m[2])); if (pair) return pair }
  }
  const bare = s.trim().match(new RegExp(String.raw`^(${NUM})\s*,\s*(${NUM})$`))
  return bare ? validPair(Number(bare[1]), Number(bare[2])) : null
}

const isShortMapLink = (url) =>
  /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(url.trim())

async function expandShortLink(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; balinsky-admin/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const fromUrl = mapLinkCoords(res.url)
    if (fromUrl) return fromUrl
    return mapLinkCoords((await res.text()).slice(0, 200_000))
  } catch {
    return null
  }
}

const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0)

const env = loadEnv()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

const { data: rows, error } = await sb.from(TABLE).select('airtable_id, data')
if (error) { console.error(error.message); process.exit(1) }

let dupCleaned = 0
let geoFilled = 0
let unresolved = 0

for (const row of rows ?? []) {
  const data = row.data ?? {}
  const name = data['Project'] ?? row.airtable_id
  const dups = Object.keys(data).filter(k => k !== MAP_LINK_FIELD && isMapLinkKey(k))
  const link = asUrl(data[MAP_LINK_FIELD]) ?? dups.map(k => asUrl(data[k])).find(Boolean) ?? null

  const next = { ...data }
  const changes = []

  // Удаляем только то, что действительно дубль ссылки: пустой ключ или ключ
  // со ссылкой. Что-то другое под похожим именем оставляем и сообщаем.
  const removable = dups.filter(k => isEmpty(data[k]) || asUrl(data[k]))
  for (const k of dups) {
    if (!removable.includes(k)) console.log(`  ! ${name}: «${k}» похож на дубль, но внутри не ссылка — оставлен`)
  }
  if (removable.length > 0) {
    for (const k of removable) delete next[k]
    if (isEmpty(next[MAP_LINK_FIELD]) && link) next[MAP_LINK_FIELD] = link
    changes.push(`дубли: ${removable.map(k => `«${k}»`).join(', ')} → «${MAP_LINK_FIELD}»`)
    dupCleaned++
  }

  if (link && (isEmpty(data[LAT_FIELD]) || isEmpty(data[LNG_FIELD]))) {
    const coords = mapLinkCoords(link) ?? (isShortMapLink(link) ? await expandShortLink(link) : null)
    if (coords) {
      next[LAT_FIELD] = coords.lat
      next[LNG_FIELD] = coords.lng
      changes.push(`координаты: ${coords.lat}, ${coords.lng}`)
      geoFilled++
    } else {
      console.log(`  ? ${name}: координаты из ссылки не разобрались — ${link}`)
      unresolved++
    }
  }

  if (changes.length === 0) continue
  console.log(`${APPLY ? '✓' : '·'} ${name}: ${changes.join('; ')}`)
  if (!APPLY) continue
  const { error: upErr } = await sb.from(TABLE).update({ data: next }).eq('airtable_id', row.airtable_id)
  if (upErr) console.error(`  ошибка записи ${row.airtable_id}: ${upErr.message}`)
}

console.log(`\nЗаписей: ${rows?.length ?? 0}. Дубли убраны: ${dupCleaned}. Координаты проставлены: ${geoFilled}. Не разобрано: ${unresolved}.`)

if (!APPLY) {
  console.log('Это сухой прогон. Запишет только `node scripts/fix-complex-map-links.mjs --apply`.')
} else {
  const { error: bumpErr } = await sb.rpc('bump_content_version', { p_kind: 'complexes' })
  if (bumpErr) console.error(`bump complexes: ${bumpErr.message}`)
  const token = env.REVALIDATE_TOKEN
  const base = env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
  if (!token) {
    console.log('REVALIDATE_TOKEN не задан — теги ISR не сброшены, обновятся по TTL.')
  } else {
    const res = await fetch(`${base}/api/revalidate-content?kinds=complexes`, {
      method: 'POST', headers: { authorization: `Bearer ${token}` },
    })
    console.log(`revalidate-content: ${res.status} ${await res.text()}`)
  }
}
