// Shared Azure-OpenAI fallback for Airtable AI fields. When a record
// contains `{state: 'error', errorType: 'monthlyConsumptionLimited',
// value: null}`, we ask Azure to regenerate the affected field(s) from
// the surrounding context, then write the result straight into the
// record so the rest of the sync pipeline never has to know.
//
// Cached on disk (`scripts/_ai-fallback-cache.json`) keyed by record
// id + a hash of the contextual fields the prompt was built from —
// running the sync ten times in a row only burns tokens once per
// changed record.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const CACHE_FILE = path.resolve('scripts', '_ai-fallback-cache.json')

let _cache = null
function loadCache() {
  if (_cache) return _cache
  try { _cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) }
  catch { _cache = {} }
  return _cache
}
function saveCache() {
  if (!_cache) return
  const tmp = CACHE_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(_cache))
  fs.renameSync(tmp, CACHE_FILE)
}

// Unwrap Airtable's AI-field shape down to a plain string (or null
// for error / empty states).
export function aiValue(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v)) {
    for (const x of v) { const u = aiValue(x); if (u) return u }
    return null
  }
  if (typeof v === 'object') {
    if (v.state === 'error') return null
    if (typeof v.value === 'string') return v.value.trim() || null
    return null
  }
  return String(v)
}

function isAiError(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && v.state === 'error'
}

// Filter the fields we hand to GPT as "context": exclude AI-error
// values, exclude binary attachments, cap long strings so we don't
// blow the context budget on a single record. Keeps the prompt tight.
function buildContext(fields, omit) {
  const ctx = {}
  for (const [k, v] of Object.entries(fields)) {
    if (omit.has(k)) continue
    if (isAiError(v)) continue
    // Drop attachment arrays — only the first non-null item needs the
    // guard because Airtable sometimes returns sparse arrays with null
    // placeholders alongside attachment dicts.
    if (Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && 'url' in v[0]) continue
    const s = aiValue(v)
    if (s == null) continue
    ctx[k] = s.length > 800 ? s.slice(0, 800) + '…' : s
  }
  return ctx
}

function hashKey(recordId, missing, ctx) {
  const h = crypto.createHash('sha1')
  h.update(recordId)
  h.update('|')
  h.update(missing.slice().sort().join(','))
  h.update('|')
  h.update(JSON.stringify(ctx, Object.keys(ctx).sort()))
  return h.digest('hex').slice(0, 16)
}

// Env is read lazily — the sync scripts load .env.local AFTER importing
// this module, so capturing process.env at module init would always
// see undefined. Reading at call time keeps the module import-safe.
function azureConfig() {
  const key = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const version = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
  const model = process.env.AZURE_OPENAI_FALLBACK_DEPLOYMENT
    || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
    || 'gpt-5.4'
  return { key, endpoint, version, model }
}

async function callAzure(systemPrompt, userPayload) {
  const { key, endpoint, version, model } = azureConfig()
  if (!key || !endpoint) {
    throw new Error('Azure OpenAI env not configured')
  }
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${model}/chat/completions?api-version=${version}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`azure ${r.status}: ${body.slice(0, 200)}`)
  }
  const j = await r.json()
  const msg = j?.choices?.[0]?.message?.content
  if (!msg) throw new Error('azure: empty content')
  return JSON.parse(msg)
}

// `entityKind` is the human label used in the prompt ("villa",
// "apartment", "complex", "rental listing", "news article", "promo
// offer", "event", "developer"). `recipes` is an array of field
// definitions {field, language, prompt}.
const SYSTEM_PROMPT_TEMPLATE = (entityKind) =>
  `You generate marketing copy for a Bali real-estate catalog (balinsky.info). The user supplies a JSON object containing one ${entityKind}'s known data plus a list of fields that must be generated because the upstream AI service is exhausted. Respond with ONE JSON object whose keys are EXACTLY the field names from the request and whose values are the generated strings (no extra commentary, no markdown fences).

Guidelines per field name suffix:
- "EN" → write in English, otherwise Russian.
- "SEO:Title" / "Name" / "ИИ Имя" / "ИИ Заголовок" / "Заголовок ИИ" / "Название ИИ" → short headline, 4–9 words, no emoji.
- "SEO:Slug" → short URL slug, lowercase a-z 0-9 dashes only, plain transliteration of headline.
- "SEO:Description" → meta description, 130–160 chars, single sentence, no clickbait.
- "Social:Title" → punchy headline ≤ 60 chars.
- "Social:Description" → 100–140 chars.
- "Notes" / "SEO Text" / "Notes EN" / "post text EN" / "Описание ИИ" / "Notes EN" → 2–4 paragraphs, plain text (no markdown), 400–700 chars total. Tone: knowledgeable real-estate broker explaining the listing to an investor.
- "Короткое название" → 2–4 word product name.
- "Тип EN" → translate the Russian type word (Вилла → Villa, Апартаменты → Apartments, etc.).
- Anything else (Формат, segment labels, etc.) → 1–3 word factual classification consistent with the context.

If you do not have enough information to write a field plausibly, return an empty string for it. Never invent prices, addresses, or developer claims that are not in the input context.`

// Mutates `record.fields` in-place: replaces AI-error fields with
// generated text. Returns the list of field names that were filled.
export async function backfillAiFields(record, entityKind) {
  const fields = record.fields || {}
  const missing = []
  for (const [k, v] of Object.entries(fields)) {
    if (isAiError(v)) missing.push(k)
  }
  if (missing.length === 0) return []
  const ctx = buildContext(fields, new Set(missing))
  const cache = loadCache()
  const key = hashKey(record.id, missing, ctx)
  let generated = cache[key]
  if (!generated) {
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE(entityKind)
    const payload = {
      context: ctx,
      fields_to_generate: missing,
    }
    generated = await callAzure(systemPrompt, payload)
    cache[key] = generated
    saveCache()
  }
  const filled = []
  for (const f of missing) {
    const v = generated?.[f]
    if (typeof v === 'string' && v.trim()) {
      fields[f] = v.trim()
      filled.push(f)
    } else {
      // Drop the error object so downstream code sees `null`/missing.
      delete fields[f]
    }
  }
  if (filled.length > 0) {
    fields['_ai_fallback_at'] = new Date().toISOString()
  }
  return filled
}

// Concurrency-limited driver. `entityKind` and `records` are forwarded
// to backfillAiFields; the function logs per-batch progress and
// returns counts.
export async function applyAiFallback(records, entityKind, opts = {}) {
  const concurrency = opts.concurrency ?? 4
  // Cost guard: hard-cap how many Azure calls one sync run can fire.
  // Cache writes accumulate across runs, so the next sync will pick up
  // where this one left off without re-burning tokens on already-done
  // rows. Override via env when intentionally backfilling a big batch.
  const limit = Number(process.env.AI_FALLBACK_LIMIT ?? opts.limit ?? 50)
  let errored = records.filter(r => Object.values(r.fields || {}).some(isAiError))
  if (errored.length === 0) return { processed: 0, filled: 0, failed: 0 }
  // Filter out rows already cached so we know the true outstanding work.
  const cache = loadCache()
  const stillNeeded = []
  for (const r of errored) {
    const missing = []
    for (const [k, v] of Object.entries(r.fields || {})) if (isAiError(v)) missing.push(k)
    const ctx = buildContext(r.fields, new Set(missing))
    const key = hashKey(r.id, missing, ctx)
    if (cache[key]) {
      // Still apply the cached fix — cheap, no Azure call.
      try { await backfillAiFields(r, entityKind) } catch {}
    } else {
      stillNeeded.push(r)
    }
  }
  if (stillNeeded.length === 0) {
    console.log(`  AI fallback: ${errored.length} record(s) — all cached`)
    return { processed: errored.length, filled: 0, failed: 0 }
  }
  const queue = stillNeeded.slice(0, limit)
  console.log(`  AI fallback: ${stillNeeded.length} record(s) need Azure; processing ${queue.length} this run (cap = ${limit})`)
  errored = queue
  let filled = 0, failed = 0
  for (let i = 0; i < errored.length; i += concurrency) {
    const chunk = errored.slice(i, i + concurrency)
    const results = await Promise.allSettled(chunk.map(r => backfillAiFields(r, entityKind)))
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.length > 0) filled += res.value.length
      else if (res.status === 'rejected') {
        failed++
        if (failed <= 3) console.warn(`    ✖ ${res.reason?.message ?? res.reason}`)
      }
    }
  }
  console.log(`  AI fallback: filled ${filled} field(s) across ${errored.length} record(s), ${failed} failure(s)`)
  return { processed: errored.length, filled, failed }
}
