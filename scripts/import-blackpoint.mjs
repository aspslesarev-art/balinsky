// Импорт объектов агентства Blackpoint (готовое + переуступка) в agent_listings.
// Источник — их маркетплейс blackpoint.group/ru/marketplace, разобранный в
// data/imports/blackpoint.json. Повторный запуск обновляет цену/текст/факты
// по slug и не перезаливает фото, если они уже есть.
//
//   node --env-file=.env.local scripts/import-blackpoint.mjs [--dry]
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const CDN = (process.env.NEXT_PUBLIC_PHOTO_CDN_BASE || '').replace(/\/$/, '')

// У агентства нет Telegram-аккаунта на сайте — заводим служебного автора
// с отрицательным id (как у входа по почте), чтобы карточка показывала их контакт.
const AUTHOR = {
  telegram_id: -900000000000001,
  username: 'Blackpoint_group',
  first_name: 'Blackpoint Group',
  is_agent: true,
  listing_trusted: true,
}
const BUCKET = { villa: 'villa-photos', apartment: 'apartment-photos' }

const items = JSON.parse(readFileSync(new URL('../data/imports/blackpoint.json', import.meta.url)))

async function ensureAuthor() {
  const { error } = await sb.from('site_users').upsert(AUTHOR, { onConflict: 'telegram_id' })
  if (error) throw new Error('site_users: ' + error.message)
}

async function uploadPhoto(kind, url, i, slug) {
  const res = await fetch(url + '?scale-down-to=2048')
  if (!res.ok) throw new Error(`photo ${res.status} ${url}`)
  const ct = res.headers.get('content-type') || 'image/jpeg'
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
  const key = `agents/${AUTHOR.telegram_id}/${slug}/${i + 1}.${ext}`
  const buf = Buffer.from(await res.arrayBuffer())
  const { error } = await sb.storage.from(BUCKET[kind]).upload(key, buf, { contentType: ct, upsert: true, cacheControl: '604800' })
  if (error) throw new Error(`storage ${key}: ${error.message}`)
  const base = CDN ? `${CDN}/storage/v1/object/public` : `${SUPABASE_URL}/storage/v1/object/public`
  return `${base}/${BUCKET[kind]}/${key}`
}

async function main() {
  console.log(`${items.length} объектов${DRY ? ' (dry run)' : ''}`)
  if (DRY) return
  await ensureAuthor()
  const { data: existing } = await sb.from('agent_listings').select('slug, photos').eq('author_id', AUTHOR.telegram_id)
  const have = new Map((existing ?? []).map(r => [r.slug, r.photos ?? []]))
  let ok = 0, fail = 0
  for (const it of items) {
    try {
      let photos = have.get(it.slug) ?? []
      if (photos.length === 0) {
        photos = []
        for (const [i, u] of it.imgs.entries()) photos.push(await uploadPhoto(it.kind, u, i, it.slug))
      }
      const row = {
        slug: it.slug, author_id: AUTHOR.telegram_id, kind: it.kind, title: it.title,
        price_usd: it.price_usd, comment: it.comment || null, data: it.data, photos,
        status: 'approved', updated_at: new Date().toISOString(),
      }
      if (!have.has(it.slug)) row.approved_at = row.updated_at
      const { error } = await sb.from('agent_listings').upsert(row, { onConflict: 'slug' })
      if (error) throw new Error(error.message)
      ok++; process.stdout.write('.')
    } catch (e) { fail++; console.error('\n✗', it.slug, e.message) }
  }
  // Объекты, которых больше нет у агентства, уходят в архив.
  const live = new Set(items.map(i => i.slug))
  const gone = [...have.keys()].filter(s => !live.has(s))
  if (gone.length) await sb.from('agent_listings').update({ status: 'archived' }).in('slug', gone)
  console.log(`\nготово: ${ok}, ошибок: ${fail}, в архив: ${gone.length}`)
}
main().catch(e => { console.error(e); process.exit(1) })
