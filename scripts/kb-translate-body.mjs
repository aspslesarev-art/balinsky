// Translate the EN KB page-body (assistant_kb.page_body_en) into de/zh/nl and
// store per-lang in Supabase Storage: feeds/_kb-body-<lang>.json = { ref_id:
// { _hash, body } }. The runtime reader (lib/kb-page-content.ts) merges these
// so listings whose only long-form body is the EN-only KB write-up render
// natively on non-RU pages. Idempotent via content hash.
//
// Usage: node scripts/kb-translate-body.mjs --lang de [--limit N] [--force] [--dry-run]
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import fs from 'node:fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
const AZURE_MODEL = process.env.AZURE_OPENAI_TRANSLATE_DEPLOYMENT || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase env not set')
if (!AZURE_KEY || !AZURE_ENDPOINT || !AZURE_MODEL) throw new Error('Azure env not set')
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const LANGS = { de: 'German', zh: 'Simplified Chinese', nl: 'Dutch', fr: 'French', id: 'Indonesian' }
const args = process.argv.slice(2)
const li = args.indexOf('--lang')
const lang = li >= 0 ? args[li + 1] : 'de'
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const limIdx = args.indexOf('--limit')
const limit = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) : Infinity
if (!LANGS[lang]) { console.error(`lang must be one of ${Object.keys(LANGS)}`); process.exit(1) }

const hashOf = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)
const CACHE_PATH = `_kb-body-${lang}.json`

async function loadCache() {
  const { data, error } = await sb.storage.from('feeds').download(CACHE_PATH)
  if (error) return {}
  try { return JSON.parse(await data.text()) } catch { return {} }
}
async function saveCache(cache) {
  const { error } = await sb.storage.from('feeds').upload(CACHE_PATH, JSON.stringify(cache), {
    contentType: 'application/json', upsert: true, cacheControl: '300',
  })
  if (error) throw new Error(`upload ${CACHE_PATH}: ${error.message}`)
}

const SYS = `You translate real-estate on-page copy from English into ${LANGS[lang]} for balinsky.info, a Bali property catalogue. Return ONLY the translated text, no preamble, no quotes.
Rules:
- Natural, fluent ${LANGS[lang]} in a Bali real-estate broker tone. Faithful to the facts — do not add or drop information, prices, numbers, dates or claims.
- Preserve markdown, line breaks and paragraph structure exactly.
- Keep numbers, prices, units (m², USD, IDR, years) verbatim.
- Bali place names (Canggu, Pererenan, Ubud, Uluwatu, Bukit, Nusa Dua, Sanur, Berawa, Batu Bolong…) and project/developer proper names stay in Latin script.
- ${lang === 'zh' ? 'Simplified Chinese has no plurals; keep Latin place/brand names.' : 'Keep the register a native buyer would read.'}`

async function callAzure(text) {
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_MODEL}/chat/completions?api-version=${AZURE_VERSION}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: AZURE_MODEL, temperature: 0.3, messages: [{ role: 'system', content: SYS }, { role: 'user', content: text }] }),
      })
      if (!r.ok) { if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 1500 * (attempt + 1))); continue } throw new Error(`azure ${r.status}: ${(await r.text()).slice(0, 200)}`) }
      const j = await r.json()
      return j.choices?.[0]?.message?.content?.trim() ?? null
    } catch (e) { if (attempt === 2) throw e; await new Promise(s => setTimeout(s, 1500 * (attempt + 1))) }
  }
  return null
}

async function loadRows() {
  const rows = []
  let from = 0
  const page = 1000
  for (;;) {
    const { data, error } = await sb.from('assistant_kb').select('ref_id, page_body_en').not('page_body_en', 'is', null).range(from, from + page - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < page) break
    from += page
  }
  return rows
}

const rows = await loadRows()
const cache = await loadCache()
const todo = []
for (const r of rows) {
  const en = (r.page_body_en || '').trim()
  if (!en) continue
  const h = hashOf(en)
  const cached = cache[r.ref_id]
  if (!force && cached && cached._hash === h && cached.body) continue
  todo.push({ ref_id: r.ref_id, en, h })
}
console.log(`${lang}: ${rows.length} rows, ${todo.length} need translation${dryRun ? ' (dry-run)' : ''}`)
if (dryRun || todo.length === 0) process.exit(0)

const CONC = 6
let done = 0, failed = 0
const batch = todo.slice(0, limit === Infinity ? todo.length : limit)
for (let i = 0; i < batch.length; i += CONC) {
  const slice = batch.slice(i, i + CONC)
  await Promise.all(slice.map(async item => {
    try {
      const out = await callAzure(item.en)
      if (out) { cache[item.ref_id] = { _hash: item.h, body: out }; done++ }
      else failed++
    } catch (e) { failed++; console.error('  fail', item.ref_id, e.message) }
  }))
  if (i % 60 === 0) { await saveCache(cache); console.log(`  ${done}/${batch.length} (${failed} failed)`) }
}
await saveCache(cache)
console.log(`${lang} DONE: ${done} translated, ${failed} failed. Cache: feeds/${CACHE_PATH}`)
