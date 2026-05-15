// Translate Airtable RU fields that don't have a `<field> EN` counterpart
// into English using Azure OpenAI. Results are kept in per-section
// Supabase Storage JSON (`feeds/_translations-<section>.json`) — the
// catalog loader merges them into row.data at runtime so the existing
// tField() lookup picks them up without any caller-side changes.
//
// Idempotent: re-running skips records that already have either an
// Airtable EN field or a cached translation. Stops translation budget
// from being spent twice on the same row.
//
// Usage:
//   node scripts/translate-missing-en.mjs              # all sections
//   node scripts/translate-missing-en.mjs villas       # one section
//   node scripts/translate-missing-en.mjs villas --limit 5
//   node scripts/translate-missing-en.mjs --dry-run    # show plan only

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

// --- env -----------------------------------------------------------------
const envFile = fs.readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY
const AZURE_KEY    = process.env.AZURE_OPENAI_API_KEY
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_VERSION  = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
const AZURE_MODEL    = process.env.AZURE_OPENAI_TRANSLATE_DEPLOYMENT
                     || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase env not set')
if (!AZURE_KEY || !AZURE_ENDPOINT || !AZURE_MODEL) throw new Error('Azure OpenAI env not set')

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

// --- sections to translate ----------------------------------------------
// `fields` is the canonical list — script translates RU values from
// these into the matching `<field> EN` slot. Already-translated rows
// (Airtable's own EN column populated, OR a cached translation present)
// are skipped on subsequent runs.
const SECTIONS = {
  villas: {
    table: 'raw_villas',
    fields: ['SEO:Title', 'ИИ Имя', 'SEO Text', 'Notes', 'SEO:Description', 'Social:Title'],
  },
  apartments: {
    table: 'raw_apartments',
    fields: ['SEO:Title', 'ИИ Имя', 'SEO Text', 'Notes', 'SEO:Description'],
  },
  complexes: {
    table: 'raw_complexes',
    fields: ['SEO:Title', 'SEO Text', 'Описание', 'ИИ Описание', 'SEO:Description', 'Social:Title'],
  },
  developers: {
    table: 'raw_developers',
    fields: [
      'SEO:Title', 'SEO Text', 'Описание ИИ', 'SEO:Description',
      'Команда', 'Бизнес и сервисы', 'Репутация и опыт',
      'Управляющая компания', 'Техника и производство',
      'Строительство и недвижимость', 'Доходность',
    ],
  },
}

// --- args ----------------------------------------------------------------
const args = process.argv.slice(2)
const wantSection = args.find(a => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity

if (wantSection && !SECTIONS[wantSection]) {
  console.error(`Unknown section: ${wantSection}. Pick from: ${Object.keys(SECTIONS).join(', ')}`)
  process.exit(1)
}

// --- helpers -------------------------------------------------------------
function unwrap(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    for (const x of v) { const u = unwrap(x); if (u) return u }
    return null
  }
  if (typeof v === 'object' && 'value' in v) return unwrap(v.value)
  return null
}

function storagePath(section) {
  return `_translations-${section}.json`
}

async function loadCache(section) {
  const path = storagePath(section)
  const { data, error } = await sb.storage.from('feeds').download(path)
  if (error) {
    if (/not found|object not found/i.test(error.message)) return {}
    throw new Error(`download ${path}: ${error.message}`)
  }
  const text = await data.text()
  try { return JSON.parse(text) } catch { return {} }
}

async function saveCache(section, cache) {
  const path = storagePath(section)
  const body = JSON.stringify(cache, null, 2)
  const { error } = await sb.storage.from('feeds').upload(path, body, {
    contentType: 'application/json',
    upsert: true,
    cacheControl: '300',
  })
  if (error) throw new Error(`upload ${path}: ${error.message}`)
}

// Single Azure call: translate one record's worth of fields in one shot.
// Returns an object keyed by the source field name (NOT field+" EN") with
// the translated string as value. Empty strings are dropped by the caller.
const SYSTEM_PROMPT = `You translate Russian real-estate marketing copy into English for balinsky.info, a Bali real-estate catalogue. The user message is a JSON object whose keys are Airtable field names and whose values are Russian source strings to translate. Respond with ONE JSON object: same keys, English translations as values.

Guidelines:
- Preserve formatting: keep markdown / line breaks / bullet markers exactly as in the source.
- Preserve numbers, prices, dates, units, and place names (Canggu, Pererenan, Ubud, Uluwatu, etc.). Do NOT translate Bali district names.
- Project / villa / complex / developer proper names stay in the original Latin spelling if already Latin; transliterate any Russian-only name into Latin once and stick with that.
- "SEO:Title" / "ИИ Имя" / similar headline fields → ≤ 9 words, no emoji, no trailing punctuation.
- "SEO:Description" → 130–160 chars, one sentence, factual, no clickbait.
- "Social:Title" → punchy headline ≤ 60 chars.
- "SEO Text" / "Notes" / "Описание" / "ИИ Описание" / "Описание ИИ" → natural English real-estate broker tone, faithful to the source paragraphs. Do not add information.
- Developer category fields ("Команда", "Бизнес и сервисы", "Репутация и опыт", "Управляющая компания", "Техника и производство", "Строительство и недвижимость", "Доходность") arrive as bullet text — translate bullet-by-bullet, preserving bullet markers.
- If a field is empty or trivial, return an empty string for it.
- Never invent prices, addresses, dates, or developer claims that are not in the input.`

async function callAzure(payload) {
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_MODEL}/chat/completions?api-version=${AZURE_VERSION}`
  let lastErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(payload) },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })
      if (r.status === 429) {
        const wait = 5000 * (attempt + 1)
        console.warn(`  rate-limited, sleeping ${wait}ms`)
        await new Promise(res => setTimeout(res, wait))
        continue
      }
      if (!r.ok) {
        const body = await r.text().catch(() => '')
        throw new Error(`azure ${r.status}: ${body.slice(0, 300)}`)
      }
      const j = await r.json()
      const msg = j?.choices?.[0]?.message?.content
      if (!msg) throw new Error('azure: empty response')
      return JSON.parse(msg)
    } catch (e) {
      lastErr = e
      if (attempt < 2) {
        console.warn(`  ${e.message} — retry ${attempt + 1}/3`)
        await new Promise(res => setTimeout(res, 1500 * (attempt + 1)))
      }
    }
  }
  throw lastErr ?? new Error('azure: unknown error')
}

// --- per-section run -----------------------------------------------------
async function runSection(name) {
  const cfg = SECTIONS[name]
  console.log(`\n=== ${name} ===`)

  const cache = await loadCache(name)
  console.log(`  cache loaded: ${Object.keys(cache).length} rows already translated`)

  let rows = []
  const PAGE = 500
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb
      .from(cfg.table)
      .select('airtable_id, data')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`select ${cfg.table}: ${error.message}`)
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < PAGE) break
  }
  console.log(`  total rows: ${rows.length}`)

  // Plan: for each row, list fields that need translating (no Airtable EN,
  // no cached entry, RU source non-empty).
  const plan = []
  for (const r of rows) {
    const id = r.airtable_id
    const d = r.data || {}
    const missing = {}
    for (const f of cfg.fields) {
      // Airtable EN slot already filled (string or wrapped value)
      const enRaw = d[`${f} EN`] ?? d[`${f} En`]
      if (unwrap(enRaw)) continue
      // Already cached locally
      if (cache[id]?.[f]) continue
      // No RU source to translate
      const ruText = unwrap(d[f])
      if (!ruText) continue
      missing[f] = ruText
    }
    if (Object.keys(missing).length > 0) plan.push({ id, missing })
  }

  console.log(`  rows needing translation: ${plan.length}`)
  if (plan.length === 0) return
  const totalFields = plan.reduce((s, p) => s + Object.keys(p.missing).length, 0)
  console.log(`  fields to translate: ${totalFields}`)

  if (dryRun) {
    console.log(`  --dry-run — sample plan entry:`)
    console.log('  ', JSON.stringify(plan[0], null, 2).slice(0, 500))
    return
  }

  let processed = 0
  for (const entry of plan) {
    if (processed >= limit) break
    processed++
    try {
      const translated = await callAzure(entry.missing)
      const merged = cache[entry.id] || {}
      let count = 0
      for (const f of Object.keys(entry.missing)) {
        const v = translated?.[f]
        if (typeof v === 'string' && v.trim()) {
          merged[f] = v.trim()
          count++
        }
      }
      if (count > 0) {
        cache[entry.id] = merged
        // Save every 10 rows so a crash mid-run loses at most 9 records.
        if (processed % 10 === 0) {
          await saveCache(name, cache)
        }
      }
      console.log(`  [${processed}/${Math.min(plan.length, limit)}] ${entry.id}: +${count} fields`)
    } catch (e) {
      console.error(`  [${processed}] ${entry.id}: ${e.message}`)
    }
  }

  // Final flush.
  await saveCache(name, cache)
  console.log(`  saved cache (${Object.keys(cache).length} rows total)`)
}

// --- main ----------------------------------------------------------------
const targets = wantSection ? [wantSection] : Object.keys(SECTIONS)
for (const name of targets) {
  await runSection(name)
}
console.log('\nDone.')
