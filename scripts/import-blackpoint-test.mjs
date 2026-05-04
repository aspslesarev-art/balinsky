// Test-imports villas from a Blackpoint CSV into raw_villas + uploads
// the Post Img cover into villa-photos/<id>/0.jpg, then updates the
// villa-photos/_manifest.json so the catalog picks them up.
//
// Every imported villa gets a `bptest_<Name>` primary key, so a single
// `node scripts/revert-blackpoint-test.mjs` wipes the entire batch.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const CSV = process.argv[2] || '/Users/andrei/Desktop/blackpoint_for_airtable.csv'
const ID_PREFIX = 'bptest_'
const SELLER_URL = 'https://t.me/Blackpoint_group'

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let inQuote = false
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; continue }
      if (c === '"') { inQuote = false; continue }
      cell += c; continue
    }
    if (c === '"') { inQuote = true; continue }
    if (c === ',') { row.push(cell); cell = ''; continue }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    if (c === '\r') continue
    cell += c
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows
}

// Slugs go into URLs and Next.js cache-tag headers — both require ASCII.
// Cyrillic in a header throws ERR_INVALID_CHAR and 500s the page.
const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function slugify(s) {
  return String(s ?? '').toLowerCase()
    .split('').map(c => TRANSLIT[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

const text = fs.readFileSync(CSV, 'utf8')
const rows = parseCsv(text)
const header = rows[0]
const records = rows.slice(1).filter(r => r[0])
console.log('parsed', records.length, 'records,', header.length, 'columns')

const get = (row, key) => {
  const i = header.indexOf(key)
  return i < 0 ? '' : (row[i] ?? '')
}
const getNum = (row, key) => {
  const v = String(get(row, key) ?? '').trim()
  if (!v) return null
  const n = Number(v.replace(/\s+/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Pull the cover image URL into the photos bucket.
async function uploadCover(airtableId, postImgUrl) {
  if (!postImgUrl) return null
  try {
    const resp = await fetch(postImgUrl)
    if (!resp.ok) { console.warn('  fetch failed:', resp.status, postImgUrl); return null }
    const buf = Buffer.from(await resp.arrayBuffer())
    const key = `${airtableId}/0.jpg`
    const { error } = await sb.storage.from('villa-photos').upload(key, buf, {
      contentType: 'image/jpeg', upsert: true, cacheControl: '604800',
    })
    if (error) { console.warn('  upload failed:', error.message); return null }
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/villa-photos/${key}`
  } catch (e) { console.warn('  cover error:', e.message); return null }
}

async function loadManifest() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.json() : {} }
  catch { return {} }
}

async function saveManifest(manifest) {
  const buf = Buffer.from(JSON.stringify(manifest), 'utf8')
  const { error } = await sb.storage.from('villa-photos').upload('_manifest.json', buf, {
    contentType: 'application/json', upsert: true, cacheControl: '60',
  })
  if (error) throw new Error('manifest upload failed: ' + error.message)
}

const manifest = await loadManifest()
let inserted = 0, withCover = 0

for (const row of records) {
  const sourceId = get(row, 'Name')           // V00745 etc.
  const airtableId = ID_PREFIX + sourceId
  const notes = get(row, 'Notes').trim()
  const district = get(row, 'Location 2') || get(row, 'Location') || null
  const bedrooms = getNum(row, 'Комнаты')
  const area = getNum(row, 'Площадь')
  const land = getNum(row, 'Земля')
  const price = getNum(row, 'Цена')
  const year = get(row, 'Year of completion') || null
  const lat = get(row, 'Geo')
  const lng = get(row, 'Geo 2')

  const titleParts = []
  if (bedrooms != null) titleParts.push(`${bedrooms}-спальная вилла`)
  else titleParts.push('Вилла')
  if (district) titleParts.push(`в ${district}`)
  if (area != null) titleParts.push(`— ${area} м²`)
  const aiName = titleParts.join(' ')

  const slugBits = [
    'blackpoint', sourceId.toLowerCase(),
    bedrooms != null ? `${bedrooms}br` : null,
    district ? slugify(district) : null,
  ].filter(Boolean)
  const slug = slugBits.join('-').slice(0, 80)

  const cover = await uploadCover(airtableId, get(row, 'Post Img'))
  if (cover) { manifest[airtableId] = [cover]; withCover++ }

  const data = {
    Name: sourceId,
    Notes: notes,
    'ИИ Имя': { state: 'generated', value: aiName, isStale: false },
    'Имя ENG': { state: 'generated', value: aiName, isStale: false },
    'SEO:Title': `${aiName} | Balinsky`,
    'SEO:Slug': { state: 'generated', value: slug, isStale: false },
    'SEO Text': notes,
    Цена: price,
    price: price,
    Земля: land,
    Площадь: area,
    Комнаты: bedrooms != null ? String(bedrooms) : null,
    Type: get(row, 'Type') || 'Villa',
    Location: get(row, 'Location') || null,
    'Location 2': district,
    'Location filter': get(row, 'Location filter') || null,
    'Year of completion': year,
    Geo: lat ? [lat] : null,
    'Geo 2': lng ? [lng] : null,
    Статус: get(row, 'Статус') || 'Построен',
    Опубликовать: true,
    'Тип сделки': get(row, 'Тип сделки') || 'Перепродажа',
    'Контакт продавца': SELLER_URL,
    'Land color': get(row, 'Land color') || get(row, 'Цвет земли вторичка') || null,
  }

  const { error } = await sb.from('raw_villas').upsert({
    airtable_id: airtableId, data,
  })
  if (error) { console.error(' insert', airtableId, error.message); continue }
  inserted++
  if (inserted % 5 === 0) console.log(`  ${inserted}/${records.length} villas`)
}

await saveManifest(manifest)
console.log(`done — ${inserted} villas inserted, ${withCover} with cover, manifest updated`)
console.log('to revert: node scripts/revert-blackpoint-test.mjs')
