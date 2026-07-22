import './_retired.mjs'
// Sync knowledge articles (Знания) from Airtable → Supabase Storage manifest.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { applyAiFallback } from '../_ai-fallback.mjs'

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

await applyAiFallback(recs, 'knowledge article')
console.log('  records:', recs.length)

// Parse leading [audience:investor|agent|life|both|all] marker from body.
// Returns { audience: KnowledgeAudience[], body: bodyWithoutMarker, hasMarker }.
// 'both' = investor+agent (business content useful for both sides of a deal).
// 'all' = investor+agent+life (very general content).
// Caller decides default when hasMarker is false.
function extractAudience(body) {
  const m = body.match(/^\s*\[audience:\s*(investor|agent|life|both|all)\s*\]\s*\n?/i)
  if (!m) return { audience: null, body, hasMarker: false }
  const tag = m[1].toLowerCase()
  const audience = tag === 'investor' ? ['investor']
    : tag === 'agent' ? ['agent']
    : tag === 'life' ? ['life']
    : tag === 'both' ? ['investor', 'agent']
    : ['investor', 'agent', 'life']
  return { audience, body: body.slice(m[0].length), hasMarker: true }
}

// Resolve a string tag from the overrides JSON into an audience array.
function audienceFromTag(tag) {
  switch ((tag || '').toLowerCase()) {
    case 'investor': return ['investor']
    case 'agent': return ['agent']
    case 'life': return ['life']
    case 'both': return ['investor', 'agent']
    case 'all': return ['investor', 'agent', 'life']
    default: return null
  }
}

// Load per-record audience overrides (Airtable id -> tag).
let audienceOverrides = {}
try {
  const raw = fs.readFileSync('scripts/knowledge-audience-overrides.json', 'utf8')
  const parsed = JSON.parse(raw)
  for (const [k, v] of Object.entries(parsed)) {
    if (k.startsWith('_')) continue
    audienceOverrides[k] = v
  }
} catch (e) {
  console.log('  no audience overrides file:', e.message)
}

const items = []
const seenSlugs = new Map()
let dropped = 0
for (const r of recs) {
  const f = r.fields || {}
  const title = fs1(f['ИИ Заголовок']) ?? fs1(f['Name'])
  const rawBody = fs1(f['Notes'])
  if (!title || !rawBody) { dropped++; continue }

  const { audience: parsed, body, hasMarker } = extractAudience(rawBody)
  // Resolution: explicit marker > per-record override > default 'life'.
  // Default 'life' fits the existing batch of Airtable records (most are
  // lifestyle / culture / wellness / utility apps).
  const audience = hasMarker ? parsed
    : (audienceFromTag(audienceOverrides[r.id]) ?? ['life'])

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
    audience,
    photo,
    externalUrl: fs1(f['Ссылка']),
    createdTime: r.createdTime ?? null,
  })
}

// Merge in repo-managed static articles from scripts/knowledge-articles.json.
// These take precedence over Airtable records with the same slug (so curated
// content survives the user's lifestyle records in Airtable). Each static
// article carries its own stable id (`kb-...`) and audience marker is parsed
// from the leading [audience:...] line like Airtable records.
const STATIC_PATH = 'scripts/knowledge-articles.json'
const seenSlugSet = new Set(items.map(i => i.slug))
let staticAdded = 0
try {
  const staticRaw = fs.readFileSync(STATIC_PATH, 'utf8')
  const staticArticles = JSON.parse(staticRaw)
  for (let idx = 0; idx < staticArticles.length; idx++) {
    const a = staticArticles[idx]
    const title = (a.name || '').trim()
    const rawBody = (a.notes || '').trim()
    if (!title || !rawBody) continue
    const { audience: parsedStatic, body, hasMarker: staticHasMarker } = extractAudience(rawBody)
    const audience = staticHasMarker ? parsedStatic : ['investor']
    let slug = slugify(title)
    const n = (seenSlugSet.has(slug) ? 2 : 1)
    if (n > 1) slug = `${slug}-static-${idx + 1}`
    seenSlugSet.add(slug)
    items.push({
      id: a.id || `kb-static-${idx + 1}`,
      slug,
      title,
      body,
      audience,
      photo: a.photo || null,
      externalUrl: a.externalUrl || null,
      createdTime: a.createdTime || new Date(Date.now() - idx * 1000).toISOString(),
    })
    staticAdded++
  }
} catch (e) {
  console.log('  no static articles file or unreadable:', e.message)
}
if (staticAdded) console.log('  static articles merged:', staticAdded)

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
