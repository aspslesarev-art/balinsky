import './_retired.mjs'
// Sync videos from Airtable → Supabase Storage manifest.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BASE = 'app7GedbSQke53qgA'
const TABLE_VIDEOS = 'tbl0vhufvu5pjXDvn'
const TABLE_DEVS = 'tblqbnI3qRWGpbRpF'
const TABLE_COMPLEXES = 'tblEGYqLVmKOmjMOo'

const BUCKET = 'feeds'
const KEY = '_videos.json'

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
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1(v.value)
  return null
}

function ytEmbed(url) {
  if (!url) return null
  let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/)
  if (m) return `https://www.youtube.com/embed/${m[1]}`
  return null
}

console.log('▶ fetching videos...')
const videos = await fetchAll(BASE, TABLE_VIDEOS)
console.log('  videos:', videos.length)

console.log('▶ fetching developer/complex local tables...')
const localDevs = await fetchAll(BASE, TABLE_DEVS)
const localComplexes = await fetchAll(BASE, TABLE_COMPLEXES)

const localDevById = new Map()
for (const d of localDevs) localDevById.set(d.id, fs1(d.fields['Developer']) ?? fs1(d.fields['Name']))
const localComplexById = new Map()
for (const c of localComplexes) localComplexById.set(c.id, fs1(c.fields['Project']) ?? fs1(c.fields['Name']))

console.log('▶ loading prod indexes...')
const { data: prodDevs } = await sb.from('raw_developers').select('data').limit(500)
const devSlugByName = new Map()
for (const d of (prodDevs ?? [])) {
  const nm = (d.data?.['Developer'] || '').toString().trim().toLowerCase()
  const slug = d.data?.['SEO:Slug']
  if (nm && slug) devSlugByName.set(nm, { name: d.data['Developer'], slug })
}

const { data: prodComplexes } = await sb.from('raw_complexes').select('slug, data').limit(500)
const complexSlugByName = new Map()
for (const c of (prodComplexes ?? [])) {
  const nm = (typeof c.data?.['Project'] === 'string' ? c.data['Project'] : '').toString().trim().toLowerCase()
  if (nm && c.slug) complexSlugByName.set(nm, { name: c.data['Project'], slug: c.slug })
}
console.log('  prod devs:', devSlugByName.size, '· prod complexes:', complexSlugByName.size)

const items = []
let dropped = 0
for (const v of videos) {
  const f = v.fields || {}
  if (f['Опубликовать'] !== true) { dropped++; continue }
  const url = fs1(f['Video'])
  if (!url) { dropped++; continue }

  const devs = []
  for (const did of (f['Developer'] || [])) {
    const nm = localDevById.get(did)
    if (!nm) continue
    const main = devSlugByName.get(nm.toLowerCase())
    devs.push({ name: nm, slug: main?.slug ?? null })
  }
  const complexes = []
  for (const cid of (f['Проект'] || [])) {
    const nm = localComplexById.get(cid)
    if (!nm) continue
    const main = complexSlugByName.get(nm.toLowerCase())
    complexes.push({ name: nm, slug: main?.slug ?? null })
  }

  // Map Airtable Язык multiselect ("Русский", "English") to short
  // codes ("ru", "en") so the UI can filter by site locale. Empty
  // array means the video applies to both languages (same fallback
  // behaviour as before, safe for untagged legacy rows).
  const langArr = Array.isArray(f['Язык']) ? f['Язык'] : []
  const languages = []
  for (const l of langArr) {
    const s = String(l).toLowerCase()
    if (s.includes('рус')) languages.push('ru')
    else if (s.includes('eng') || s.includes('англ')) languages.push('en')
  }

  items.push({
    id: v.id,
    name: fs1(f['Name']),
    url,
    embedUrl: ytEmbed(url),
    addedAt: fs1(f['Дата добавления']),
    languages,
    developers: devs,
    complexes,
  })
}

// Sort: newest first
items.sort((a, b) => {
  const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0
  const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0
  return tb - ta
})

const linkedDev = items.filter(i => i.developers.some(d => d.slug)).length
const linkedComplex = items.filter(i => i.complexes.some(c => c.slug)).length
console.log('▶ kept:', items.length, '· dropped:', dropped, '· with dev slug:', linkedDev, '· with complex slug:', linkedComplex)

const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(KEY, body, { contentType: 'application/json', upsert: true })
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${KEY}`)
