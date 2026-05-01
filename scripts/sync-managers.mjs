// Sync managers (Менеджеры застройщиков) from Airtable → Supabase Storage manifest.
// Each manager is keyed by the slug of its main-base developer so any page that
// knows the developer slug can fetch its manager card directly.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const BASE = 'appg0DOPvgiHj8f4x'
const MANAGERS_TABLE = 'tblwDatCp7hsx7UGb'
const DEV_TABLE = 'tblpKy7gSF4Rpc7Cb' // local Developer table in managers base

const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BUCKET = 'managers'
const KEY = '_managers.json'

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
function bestAttachmentUrl(att) {
  if (!Array.isArray(att) || att.length === 0) return null
  const a = att[0]
  return a?.thumbnails?.large?.url ?? a?.url ?? null
}

await ensureBucket()
console.log('▶ fetching managers + local dev table…')
const [managers, localDevs] = await Promise.all([
  fetchAll(BASE, MANAGERS_TABLE),
  fetchAll(BASE, DEV_TABLE),
])
console.log('  managers:', managers.length, 'local devs:', localDevs.length)

// Build map: localDevRecordId -> developerName
const localDevById = new Map()
for (const d of localDevs) {
  const name = fs1(d.fields['Developer']) ?? fs1(d.fields['Name'])
  if (name) localDevById.set(d.id, name)
}

// Pull main-base developers to map name -> slug (case-insensitive on name)
const { data: prodDevs } = await sb.from('raw_developers').select('data').limit(500)
const slugByName = new Map()
for (const d of (prodDevs ?? [])) {
  const nm = (d.data?.['Developer'] || '').toString().trim().toLowerCase()
  const slug = d.data?.['SEO:Slug']
  if (nm && slug) slugByName.set(nm, slug)
}
console.log('  prod developers:', slugByName.size)

const items = []
let dropped = 0
for (const r of managers) {
  const f = r.fields || {}
  const name = fs1(f['Name'])
  if (!name) { dropped++; continue }

  // Resolve developer slug via manager's linked record -> developer name -> main slug
  const linked = Array.isArray(f['Застройщик']) ? f['Застройщик'] : []
  const slugs = []
  const developerNames = []
  for (const id of linked) {
    const devName = localDevById.get(id)
    if (!devName) continue
    developerNames.push(devName)
    const slug = slugByName.get(devName.toLowerCase())
    if (slug) slugs.push(slug)
  }
  if (slugs.length === 0) { dropped++; continue } // manager not linked to any published developer

  const languages = Array.isArray(f['Языки']) ? f['Языки'] : []
  const rating = typeof f['Рейтинг'] === 'number' ? f['Рейтинг'] : null

  items.push({
    id: r.id,
    name,
    photo: bestAttachmentUrl(f['Фото']),
    telegram: fs1(f['Telegram']),
    telegramHandle: fs1(f['TG Name']),
    whatsapp: fs1(f['WhatsApp']),
    botRequest: fs1(f['Заявка в бота']),
    rating,
    languages,
    developerSlugs: slugs,
    developerNames,
  })
}

console.log('▶ kept:', items.length, 'dropped:', dropped)
const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/json', upsert: true,
})
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${KEY}`)
