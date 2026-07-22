import './_retired.mjs'
// Sync news from Airtable → Supabase Storage manifest.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { ensureBucket as ensureBucketHelper, loadPhotoCache, savePhotoCache, attachmentOf, syncAttachment } from './lib-photo-sync.mjs'
import { applyAiFallback } from '../_ai-fallback.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const NEWS_BASE = 'appjkxFu5bu0Zi08J'
const NEWS_TABLE = 'tblwXXOBuDaG4yD4F'
const NEWS_COMPLEX_TABLE = 'tblIZWnWMxrcsKvnv'  // "Компленксы" в этой базе
const NEWS_DEV_TABLE = 'tbleYNDKkaqfwfNYZ'      // "Застройщики" в этой базе

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BUCKET = 'news'
const MANIFEST_KEY = '_news.json'
const PHOTO_BUCKET = 'news-photos'

async function ensureBucket() {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true })
    if (error) throw error
    console.log('created bucket', BUCKET)
  }
}

async function fetchAll(baseId, tableId) {
  const out = []
  let offset
  for (let i = 0; i < 200; i++) {
    const u = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`)
    u.searchParams.set('pageSize', '100')
    if (offset) u.searchParams.set('offset', offset)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
    const j = await r.json()
    out.push(...j.records)
    if (!j.offset) break
    offset = j.offset
  }
  return out
}

function fs1(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1(v.value)
  return null
}

// Cyrillic → Latin transliteration. Mirrors lib/translit.ts so we
// can build URL-safe slugs from the Russian news title without
// shipping the editor's English-translated SEO:Slug as the canonical
// URL. Aliases keep old indexed URLs alive via 301 redirects.
const TRANSLIT_MAP = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function slugifyFromRu(title) {
  if (!title) return null
  let out = ''
  for (const ch of title.toLowerCase()) {
    out += TRANSLIT_MAP[ch] ?? ch
  }
  return out
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || null
}

await ensureBucket()
await ensureBucketHelper(sb, PHOTO_BUCKET)

console.log('▶ fetching news…')
const newsRecs = await fetchAll(NEWS_BASE, NEWS_TABLE)
console.log('  news records:', newsRecs.length)

await applyAiFallback(newsRecs, 'news article')

console.log('▶ fetching complexes (in news base)…')
const complexRecs = await fetchAll(NEWS_BASE, NEWS_COMPLEX_TABLE)
console.log('  complexes:', complexRecs.length)

console.log('▶ fetching developers (in news base)…')
const devRecs = await fetchAll(NEWS_BASE, NEWS_DEV_TABLE)
console.log('  developers:', devRecs.length)

// Maps for resolving links
const complexById = new Map()
for (const c of complexRecs) {
  complexById.set(c.id, {
    name: fs1(c.fields['Developer']) ?? fs1(c.fields['Name']) ?? fs1(c.fields['ИИ Имя']),
  })
}
const devById = new Map()
for (const d of devRecs) {
  devById.set(d.id, {
    name: fs1(d.fields['Developer']) ?? fs1(d.fields['Name']) ?? fs1(d.fields['ИИ Имя']),
    slug: fs1(d.fields['SEO:Slug']),
  })
}

// Resolve developer slugs from production raw_developers (links to /ru/zastrojshhiki/<slug>)
const { data: prodDevs } = await sb.from('raw_developers').select('data').limit(500)
const mainDevByNameLower = new Map()
for (const d of (prodDevs ?? [])) {
  const nm = (d.data?.['Developer'] || '').toString().trim().toLowerCase()
  const slug = d.data?.['SEO:Slug'] || null
  if (nm && slug) mainDevByNameLower.set(nm, { name: d.data['Developer'], slug })
}
console.log('  main developers loaded:', mainDevByNameLower.size)

const items = []
const slugCollisions = new Map()
let dropped = 0
// Persistent photo cache (Supabase Storage) — skip re-downloading unchanged photos.
const photoCache = await loadPhotoCache(sb, PHOTO_BUCKET)
for (const r of newsRecs) {
  const f = r.fields || {}
  const title = fs1(f['ИИ Заголовок']) ?? fs1(f['SEO:Title']) ?? fs1(f['Name'])
  const seoDesc = fs1(f['SEO:Description'])
  const text = fs1(f['Notes'])
  const date = fs1(f['Date'])
  // Canonical slug = transliterated RU title. Editor's SEO:Slug stays
  // as an alias so old Google-indexed URLs keep working via the
  // detail page's 301 redirect.
  const editorSlug = fs1(f['SEO:Slug'])
  let slug = slugifyFromRu(title)
  if (slug) {
    // Disambiguate: if two news share a transliterated slug, append
    // -2, -3… based on insertion order.
    const used = slugCollisions.get(slug) ?? 0
    if (used > 0) slug = `${slug}-${used + 1}`
    slugCollisions.set(slug, 1)
  } else {
    slug = editorSlug
  }
  if (!slug || !title) { dropped++; continue }
  const aliases = []
  if (editorSlug && editorSlug !== slug) aliases.push(editorSlug)

  const att = attachmentOf(f['Social:Image']) ?? attachmentOf(f['Attachments'])
  const photo = att ? await syncAttachment(sb, PHOTO_BUCKET, r.id, att, photoCache) : null

  // Тема → developer (this is the primary link). Резолвим через news-base devs table, потом через main devs manifest для slug.
  const developerNames = new Set()
  for (const id of (f['Тема'] || [])) {
    const dev = devById.get(id)
    if (dev?.name) developerNames.add(dev.name)
  }
  const developers = []
  for (const nm of developerNames) {
    const main = mainDevByNameLower.get(nm.toLowerCase())
    developers.push({ name: nm, slug: main?.slug ?? null })
  }

  // Комплекс — для контекста, имена комплексов
  const complexNames = (f['Комплекс'] || []).map(id => complexById.get(id)?.name).filter(Boolean)

  items.push({
    id: r.id,
    slug,
    aliases,
    title,
    seoDescription: seoDesc,
    body: text,
    date,
    createdAt: r.createdTime ?? null,
    photo,
    externalUrl: fs1(f['ссылка']),
    videoUrl: fs1(f['видео']),
    pinned: f['На главной (бесплатно)'] === true,
    complexNames,
    developers,
  })
}
await savePhotoCache(sb, PHOTO_BUCKET, photoCache)

// Sort: pinned first, then by Airtable record creation time desc
// (newest added shows up first). The editor-set `Date` field stays
// for display only — it can be off by hours/days from the actual
// publish moment when the editor backdates an entry.
items.sort((a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0
  return cb - ca
})

console.log('▶ kept:', items.length, 'dropped:', dropped)

const payload = {
  generatedAt: new Date().toISOString(),
  count: items.length,
  items,
}
const body = JSON.stringify(payload)
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(MANIFEST_KEY, body, {
  contentType: 'application/json',
  upsert: true,
})
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${MANIFEST_KEY}`)

const { notifyAgents } = await import('./_agent-notify.mjs')
await notifyAgents('news', items.map(it => ({
  sourceId: it.id,
  developerNames: (it.developers ?? []).map(d => d.name).filter(Boolean),
  title: it.title || '(без заголовка)',
  body: it.seoDescription ?? null,
  path: it.slug ? `/ru/novosti/${it.slug}` : null,
})))
