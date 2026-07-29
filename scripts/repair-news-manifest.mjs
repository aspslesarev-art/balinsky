// One-off repair for the news Storage manifest.
//
// Two defects landed on records created through /admin/data before the
// fixes in lib/admin/adapters/storage-manifest.ts (auto slug) and
// lib/photo-cdn.ts (Bunny-era path-strip):
//   1. no `slug` → the listing linked to /ru/novosti/undefined and the
//      detail page 404'd;
//   2. `photo` pointing at https://images.balinsky.info/<bucket>/<key>,
//      which the Cloudflare Worker answers with 401/404 — it mirrors the
//      full /storage/v1/object/public/ path.
//
// Idempotent: re-running it finds nothing to change. Run with
//   node --env-file=.env.local scripts/repair-news-manifest.mjs [--apply]
// Without --apply it only reports what it would change.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const CDN_HOST = 'https://images.balinsky.info'
const BUCKET = 'news'
const KEY = '_news.json'
const APPLY = process.argv.includes('--apply')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

// Mirrors lib/admin/slugify.ts — kept in sync by hand, this script is one-off.
function slugifyTitle(title) {
  if (!title) return ''
  let out = ''
  for (const ch of String(title).toLowerCase()) out += TRANSLIT[ch] ?? ch
  return out.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '')
}

function uniqueSlug(base, taken) {
  if (!base || !taken.has(base)) return base
  for (let n = 2; n < 1000; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  }
  return `${base}-${Date.now()}`
}

// https://images.balinsky.info/news-photos/x.jpg (404)
//   → https://images.balinsky.info/storage/v1/object/public/news-photos/x.jpg
function repairPhotoUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(`${CDN_HOST}/`)) return url
  const path = url.slice(CDN_HOST.length + 1)
  if (path.startsWith('storage/v1/object/public/')) return url
  return `${CDN_HOST}/storage/v1/object/public/${path}`
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${KEY}?t=${Date.now()}`, { cache: 'no-store' })
if (!res.ok) {
  console.error(`manifest fetch failed: ${res.status}`)
  process.exit(1)
}
const manifest = await res.json()
const items = Array.isArray(manifest.items) ? manifest.items : []
if (items.length === 0) {
  console.error('manifest has no items — refusing to overwrite')
  process.exit(1)
}

const taken = new Set()
for (const it of items) {
  if (it.slug) taken.add(it.slug)
  if (Array.isArray(it.aliases)) for (const a of it.aliases) if (a) taken.add(a)
}

const changes = []
const next = items.map(it => {
  const patch = {}
  if (!it.slug || !String(it.slug).trim()) {
    const slug = uniqueSlug(slugifyTitle(it.title), taken)
    if (slug) {
      taken.add(slug)
      patch.slug = slug
      changes.push(`${it.id}: slug → ${slug}`)
    }
  }
  const photo = repairPhotoUrl(it.photo)
  if (photo !== it.photo) {
    patch.photo = photo
    changes.push(`${it.id}: photo → ${photo}`)
  }
  return Object.keys(patch).length ? { ...it, ...patch } : it
})

if (changes.length === 0) {
  console.log('nothing to repair')
  process.exit(0)
}
console.log(changes.join('\n'))

if (!APPLY) {
  console.log(`\n(dry run — ${changes.length} change(s); re-run with --apply to write)`)
  process.exit(0)
}

const body = Buffer.from(JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: next.length,
  items: next,
}))
const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/json', upsert: true, cacheControl: '60',
})
if (error) {
  console.error(`upload failed: ${error.message}`)
  process.exit(1)
}
console.log(`\napplied ${changes.length} change(s) to ${BUCKET}/${KEY}`)
