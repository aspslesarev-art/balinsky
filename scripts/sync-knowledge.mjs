// Sync knowledge articles (Знания) from Airtable → Supabase Storage manifest.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const BASE = 'apprLayx1J75RvP95'
const TABLE = 'tblE1XTsYrH29f7QC'
const TOKEN = process.env.AIRTABLE_TOKEN
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BUCKET = 'knowledge'
const KEY = '_knowledge.json'

const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function slugify(s) {
  if (!s) return ''
  let out = ''
  for (const ch of s.toLowerCase()) out += TRANSLIT[ch] ?? ch
  return out
    .replace(/[^a-z0-9\-_\s]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'article'
}

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
function urlOfFirstAttachment(att) {
  if (!Array.isArray(att) || att.length === 0) return null
  const a = att[0]
  return a.thumbnails?.large?.url ?? a.url ?? null
}

await ensureBucket()
console.log('▶ fetching knowledge…')
const recs = await fetchAll(BASE, TABLE)
console.log('  records:', recs.length)

const items = []
const seenSlugs = new Map()
let dropped = 0
for (const r of recs) {
  const f = r.fields || {}
  const title = fs1(f['ИИ Заголовок']) ?? fs1(f['Name'])
  const body = fs1(f['Notes'])
  if (!title || !body) { dropped++; continue }

  let slug = slugify(title)
  // dedupe slugs by appending suffix
  const n = (seenSlugs.get(slug) ?? 0) + 1
  seenSlugs.set(slug, n)
  if (n > 1) slug = `${slug}-${n}`

  const photo = urlOfFirstAttachment(f['Картинка ИИ']) ?? urlOfFirstAttachment(f['Attachments'])

  items.push({
    id: r.id,
    slug,
    title,
    body,
    photo,
    externalUrl: fs1(f['Ссылка']),
    createdTime: r.createdTime ?? null,
  })
}

// Sort: newest by createdTime first
items.sort((a, b) => {
  const ta = a.createdTime ? new Date(a.createdTime).getTime() : 0
  const tb = b.createdTime ? new Date(b.createdTime).getTime() : 0
  return tb - ta
})

console.log('▶ kept:', items.length, 'dropped:', dropped)
const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
console.log('  payload size:', (body.length / 1024).toFixed(1), 'KB')

const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/json', upsert: true,
})
if (error) throw error
console.log(`✓ uploaded ${BUCKET}/${KEY}`)
