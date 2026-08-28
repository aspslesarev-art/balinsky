// Разовый прогон: у каждого комплекса `SEO:Slug` внутри data должен повторять
// колонку `slug`.
//
// Зачем: сайт открывает страницу ЖК по колонке `slug`, а база знаний
// ассистента (scripts/_kb-build.mjs) и связка с трекером рынка
// (lib/market/catalog.ts) ищут запись по `SEO:Slug`. Комплекс, заведённый в
// админке, получал только колонку — и для Балины его не существовало.
//
// Новые записи и любое сохранение карточки теперь проставляют копию сами
// (lib/admin/adapters/sql-jsonb.ts, `mirrorSlugField`). Этот скрипт закрывает
// то, что накопилось раньше, одним заходом.
//
// Использование:
//   node scripts/backfill-complex-seo-slug.mjs           # отчёт, ничего не пишет
//   node scripts/backfill-complex-seo-slug.mjs --apply   # записать в Supabase

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { normalizeSlug } from './_slug-fallback.mjs'

const APPLY = process.argv.includes('--apply')
const TABLE = 'raw_complexes'
const MIRROR = 'SEO:Slug'

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

const str = (v) => {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return str(v[0])
  if (v && typeof v === 'object' && 'value' in v) return str(v.value)
  return ''
}

const env = loadEnv()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

const { data: rows, error } = await sb.from(TABLE).select('airtable_id, slug, data')
if (error) { console.error(error.message); process.exit(1) }

// Занятые слаги — чтобы придуманный слаг не наехал на существующий.
const taken = new Set((rows ?? []).map(r => str(r.slug)).filter(Boolean))
function freeSlug(base) {
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    if (!taken.has(candidate)) { taken.add(candidate); return candidate }
  }
  return `${base}-${Date.now()}`
}

let mirrored = 0
let slugMade = 0
let skipped = 0
const dupes = new Map()

for (const row of rows ?? []) {
  const data = row.data ?? {}
  const name = str(data['Project'])
  let slug = str(row.slug)
  const update = {}

  if (!slug) {
    // Без слага нет страницы вообще. Собираем из названия — так же, как это
    // делает админка при создании.
    const base = normalizeSlug(name)
    if (!base) {
      console.log(`  ! ${row.airtable_id}: ни слага, ни названия — пропуск`)
      skipped++
      continue
    }
    slug = freeSlug(base)
    update.slug = slug
    slugMade++
    console.log(`${APPLY ? '✓' : '·'} ${name}: слаг ← ${slug}`)
  }

  if (str(data[MIRROR]) !== slug) {
    update.data = { ...data, [MIRROR]: slug }
    mirrored++
    console.log(`${APPLY ? '✓' : '·'} ${name || row.airtable_id}: ${MIRROR} «${str(data[MIRROR]) || '—'}» → «${slug}»`)
  }

  const list = dupes.get(slug) ?? []
  list.push(name || row.airtable_id)
  dupes.set(slug, list)

  if (!Object.keys(update).length || !APPLY) continue
  const { error: upErr } = await sb.from(TABLE).update(update).eq('airtable_id', row.airtable_id)
  if (upErr) console.error(`  ошибка записи ${row.airtable_id}: ${upErr.message}`)
}

const collisions = [...dupes.entries()].filter(([, names]) => names.length > 1)
if (collisions.length) {
  console.log('\nОдин слаг на несколько комплексов — открывается только один из них:')
  for (const [slug, names] of collisions) console.log(`  ${slug}: ${names.join(', ')}`)
}

console.log(`\nЗаписей: ${rows?.length ?? 0}. Слаг создан: ${slugMade}. ${MIRROR} выровнен: ${mirrored}. Пропущено: ${skipped}.`)

if (!APPLY) {
  console.log('Это сухой прогон. Запишет только `node scripts/backfill-complex-seo-slug.mjs --apply`.')
} else if (mirrored || slugMade) {
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
  console.log('Слаг-индекс детальных страниц пересоберётся ночным scripts/sync-detail-indexes.mjs.')
}
