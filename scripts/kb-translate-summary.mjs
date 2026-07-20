// Translate the AI knowledge-base summaries (assistant_kb.title + .summary, RU)
// into en/de/id/fr/zh/nl and store per-lang in Supabase Storage:
// feeds/_kb-summary-<lang>.json = { ref_id: { title, summary } }.
// The /api/llm/search endpoint and /llms-full.txt read these so the AI-facing
// corpus is native in every language. RU stays in assistant_kb (Balisa uses it).
// Idempotent via content hash. Usage: node scripts/kb-translate-summary.mjs --lang en [--only villa,apartment] [--limit N] [--force] [--dry-run]
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
if (!SUPABASE_URL || !SERVICE_KEY || !AZURE_KEY || !AZURE_ENDPOINT || !AZURE_MODEL) throw new Error('env not set')
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const LANGS = { en: 'English', de: 'German', id: 'Indonesian', fr: 'French', zh: 'Simplified Chinese', nl: 'Dutch', pl: 'Polish', uk: 'Ukrainian' }
const args = process.argv.slice(2)
const li = args.indexOf('--lang'); const lang = li >= 0 ? args[li + 1] : 'en'
const onlyIdx = args.indexOf('--only'); const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null
const limIdx = args.indexOf('--limit'); const limit = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) : Infinity
const DRY = args.includes('--dry-run'); const FORCE = args.includes('--force')
if (!LANGS[lang]) { console.error(`lang one of ${Object.keys(LANGS)}`); process.exit(1) }

const CACHE_PATH = `_kb-summary-${lang}.json`
const hashOf = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)
async function loadCache() { const { data, error } = await sb.storage.from('feeds').download(CACHE_PATH); if (error) return {}; try { return JSON.parse(await data.text()) } catch { return {} } }
async function saveCache(c) { const { error } = await sb.storage.from('feeds').upload(CACHE_PATH, JSON.stringify(c), { contentType: 'application/json', upsert: true, cacheControl: '300' }); if (error) throw new Error(error.message) }

const SYS = `You translate Bali real-estate knowledge-base entries from Russian into ${LANGS[lang]} for balinsky.info. Input is a JSON object {"title": "...", "summary": "..."}. Return ONE JSON object with the SAME keys, translated into natural, fluent ${LANGS[lang]} in a real-estate broker/investor tone. Rules: faithful to facts — do not add/drop info, numbers, prices, %, m², years; keep Bali place names (Canggu, Uluwatu, Ubud, Sanur, Bukit, Nusa Dua, Berawa, Pererenan…), project/developer proper names, PBG/SLF/leasehold/freehold/PT PMA/KITAS in Latin; ${lang === 'zh' ? 'Simplified Chinese, no plurals' : 'native register'}. Return JSON only, no markdown fences.`

async function callAzure(obj) {
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_MODEL}/chat/completions?api-version=${AZURE_VERSION}`
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: AZURE_MODEL, temperature: 0.3, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: JSON.stringify(obj) }] }) })
      if (!r.ok) { if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 1500 * (a + 1))); continue } throw new Error(`azure ${r.status}: ${(await r.text()).slice(0, 150)}`) }
      const j = await r.json(); const c = j.choices?.[0]?.message?.content
      if (!c) return null
      const parsed = JSON.parse(c)
      return { title: String(parsed.title ?? obj.title ?? ''), summary: String(parsed.summary ?? '') }
    } catch (e) { if (a === 2) throw e; await new Promise(s => setTimeout(s, 1500 * (a + 1))) }
  }
  return null
}

async function loadRows() {
  const rows = []; let from = 0; const page = 1000
  for (;;) {
    let q = sb.from('assistant_kb').select('ref_id, kind, title, summary').not('summary', 'is', null).order('kind', { ascending: true }).range(from, from + page - 1)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    rows.push(...data); if (data.length < page) break; from += page
  }
  return only ? rows.filter(r => only.includes(r.kind)) : rows
}

const rows = await loadRows()
const cache = await loadCache()
const todo = []
for (const r of rows) {
  const src = JSON.stringify({ title: r.title || '', summary: r.summary || '' })
  const h = hashOf(src)
  if (!FORCE && cache[r.ref_id]?._hash === h && cache[r.ref_id]?.summary) continue
  todo.push({ ref_id: r.ref_id, obj: { title: r.title || '', summary: r.summary || '' }, h })
}
console.log(`${lang}: ${rows.length} rows, ${todo.length} to translate${DRY ? ' (dry)' : ''}`)
if (DRY || todo.length === 0) process.exit(0)

const CONC = 6; let done = 0, failed = 0
const batch = todo.slice(0, limit === Infinity ? todo.length : limit)
for (let i = 0; i < batch.length; i += CONC) {
  await Promise.all(batch.slice(i, i + CONC).map(async it => {
    try { const out = await callAzure(it.obj); if (out) { cache[it.ref_id] = { _hash: it.h, title: out.title, summary: out.summary }; done++ } else failed++ }
    catch (e) { failed++; if (failed < 5) console.error('  fail', it.ref_id, e.message) }
  }))
  if (i % 60 === 0) { await saveCache(cache); process.stdout.write(`\r  ${done}/${batch.length} (${failed} failed)`) }
}
await saveCache(cache)
console.log(`\n${lang} DONE: ${done} translated, ${failed} failed → feeds/${CACHE_PATH}`)
