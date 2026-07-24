// Translate the per-complex legal-audit fields (raw_complexes.data, RU source)
// into en/de/id/fr/zh/nl/pl/uk and store per-lang in Supabase Storage:
// feeds/_complex-legal-<lang>.json = { [airtable_id]: { ok: [...], questions: [...] } },
// one translated string per authored line. Read at runtime by
// lib/complex-legal-i18n.ts. Idempotent via content hash.
// Usage: node scripts/translate-complex-legal.mjs --lang en [--only <slug>] [--force] [--dry-run]
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

const OK_FIELD = 'Юр-проверка: в порядке'
const Q_FIELD = 'Юр-проверка: вопросы'

const LANGS = { en: 'English', de: 'German', id: 'Indonesian', fr: 'French', zh: 'Simplified Chinese', nl: 'Dutch', pl: 'Polish', uk: 'Ukrainian' }
const args = process.argv.slice(2)
const li = args.indexOf('--lang'); const lang = li >= 0 ? args[li + 1] : 'en'
const onlyIdx = args.indexOf('--only'); const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null
const DRY = args.includes('--dry-run'); const FORCE = args.includes('--force')
if (!LANGS[lang]) { console.error(`lang one of ${Object.keys(LANGS)}`); process.exit(1) }

const CACHE_PATH = `_complex-legal-${lang}.json`
const hashOf = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)
async function loadCache() { const { data, error } = await sb.storage.from('feeds').download(CACHE_PATH); if (error) return {}; try { return JSON.parse(await data.text()) } catch { return {} } }
async function saveCache(c) { const { error } = await sb.storage.from('feeds').upload(CACHE_PATH, JSON.stringify(c), { contentType: 'application/json', upsert: true, cacheControl: '300' }); if (error) throw new Error(error.message) }

const firstString = v => {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}
const toLines = raw => (raw ? raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean) : [])

const SYS = `You translate Bali real-estate legal due-diligence notes from Russian into ${LANGS[lang]} for balinsky.info. Input is a JSON object {"ok": ["item", ...], "questions": ["item", ...]} — each item is one short due-diligence point. Return ONE JSON object with the SAME keys and the SAME number of items in each array, each item translated into natural, professional ${LANGS[lang]} in a real-estate lawyer/broker tone. Rules: faithful — do NOT add, drop, merge or reorder items; keep every number, date, price, %, m², area and year exactly; keep in Latin all Bali place names (Ubud, Sayan, Canggu…), person/company proper names (Ida Bagus…, Oleg Mikhailov, Filipp Orlov, LB Group, PT PMA…) and Indonesian legal/permit terms (BPN, SHM, PBG, SLF, NIB, KBLI, PKKPR, PKPLH, UKL-UPL, Amdalnet, SIMBG, PBB, PPh, bukti potong, Pasal, leasehold, freehold, KDB, KLB, addendum); preserve each item's structure — a short lead phrase, then a sentence break, then the detail. ${lang === 'zh' ? 'Simplified Chinese, no plurals.' : 'Native register.'} Return JSON only, no markdown fences.`

async function callAzure(obj) {
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_MODEL}/chat/completions?api-version=${AZURE_VERSION}`
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: AZURE_MODEL, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: JSON.stringify(obj) }] }) })
      if (!r.ok) { if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 1500 * (a + 1))); continue } throw new Error(`azure ${r.status}: ${(await r.text()).slice(0, 150)}`) }
      const j = await r.json(); const c = j.choices?.[0]?.message?.content
      if (!c) return null
      const parsed = JSON.parse(c)
      const ok = Array.isArray(parsed.ok) ? parsed.ok.map(String) : []
      const questions = Array.isArray(parsed.questions) ? parsed.questions.map(String) : []
      return { ok, questions }
    } catch (e) { if (a === 2) throw e; await new Promise(s => setTimeout(s, 1500 * (a + 1))) }
  }
  return null
}

async function loadRows() {
  const { data, error } = await sb.from('raw_complexes').select('airtable_id, slug, data')
  if (error) throw new Error(error.message)
  return (data ?? [])
    .filter(r => only ? r.slug === only : true)
    .map(r => ({ id: r.airtable_id, slug: r.slug, ok: toLines(firstString(r.data?.[OK_FIELD])), questions: toLines(firstString(r.data?.[Q_FIELD])) }))
    .filter(r => r.ok.length || r.questions.length)
}

const rows = await loadRows()
const cache = await loadCache()
const todo = []
for (const r of rows) {
  const src = JSON.stringify({ ok: r.ok, questions: r.questions })
  const h = hashOf(src)
  if (!FORCE && cache[r.id]?._hash === h) continue
  todo.push({ id: r.id, slug: r.slug, obj: { ok: r.ok, questions: r.questions }, h })
}
console.log(`${lang}: ${rows.length} complexes with legal notes, ${todo.length} to translate${DRY ? ' (dry)' : ''}`)
if (DRY || todo.length === 0) process.exit(0)

let done = 0, failed = 0
for (const it of todo) {
  try {
    const out = await callAzure(it.obj)
    if (out) { cache[it.id] = { _hash: it.h, ok: out.ok, questions: out.questions }; done++ }
    else failed++
  } catch (e) { failed++; console.error('  fail', it.slug, e.message) }
  await saveCache(cache)
  process.stdout.write(`\r  ${done}/${todo.length} (${failed} failed)`)
}
console.log(`\n${lang} DONE: ${done} translated, ${failed} failed → feeds/${CACHE_PATH}`)
