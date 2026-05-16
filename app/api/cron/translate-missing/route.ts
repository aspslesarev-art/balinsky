// Cron / on-demand fallback for the Azure-OpenAI translation pipeline.
//
// Runs the same logic as scripts/translate-missing.mjs but on Vercel:
// when an Airtable webhook misses a row (rate limit, transient error,
// network blip) hitting this endpoint catches it and fills the gap.
//
// Auth: `Authorization: Bearer ${CRON_SECRET}`.
//
// Query params:
//   lang=en,zh,fr,de   comma-separated (default: en).
//   section=villas,...  narrow to subset (default: all).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Lang = 'en' | 'zh' | 'fr' | 'de'
const LANGS: Record<Lang, { name: string; suffix: string }> = {
  en: { name: 'English',            suffix: '' },
  zh: { name: 'Simplified Chinese', suffix: '-zh' },
  fr: { name: 'French',             suffix: '-fr' },
  de: { name: 'German',             suffix: '-de' },
}

type Section = {
  source: 'table' | 'manifest'
  table?: string
  url?: string
  idField?: string
  fields: string[]
}

function sections(supabaseUrl: string): Record<string, Section> {
  return {
    villas:     { source: 'table', table: 'raw_villas',     fields: ['SEO:Title', 'ИИ Имя', 'SEO Text', 'Notes', 'SEO:Description', 'Social:Title'] },
    apartments: { source: 'table', table: 'raw_apartments', fields: ['SEO:Title', 'ИИ Имя', 'SEO Text', 'Notes', 'SEO:Description'] },
    complexes:  { source: 'table', table: 'raw_complexes',  fields: ['SEO:Title', 'SEO Text', 'Описание', 'ИИ Описание', 'SEO:Description', 'Social:Title'] },
    developers: { source: 'table', table: 'raw_developers', fields: ['SEO:Title', 'SEO Text', 'Описание ИИ', 'SEO:Description', 'Команда', 'Бизнес и сервисы', 'Репутация и опыт', 'Управляющая компания', 'Техника и производство', 'Строительство и недвижимость', 'Доходность'] },
    news:       { source: 'manifest', url: `${supabaseUrl}/storage/v1/object/public/news/_news.json`,             idField: 'id', fields: ['title', 'seoDescription', 'body'] },
    promo:      { source: 'manifest', url: `${supabaseUrl}/storage/v1/object/public/promo/_promo.json`,           idField: 'id', fields: ['title', 'seoDescription', 'body'] },
    events:     { source: 'manifest', url: `${supabaseUrl}/storage/v1/object/public/events/_events.json`,         idField: 'id', fields: ['title', 'seoDescription', 'body'] },
    knowledge:  { source: 'manifest', url: `${supabaseUrl}/storage/v1/object/public/knowledge/_knowledge.json`,   idField: 'id', fields: ['title', 'body'] },
    rental:     { source: 'manifest', url: `${supabaseUrl}/storage/v1/object/public/rental/_rental.json`,         idField: 'id', fields: ['title', 'notes'] },
  }
}

function unwrap(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    for (const x of v) { const u = unwrap(x); if (u) return u }
    return null
  }
  if (typeof v === 'object' && 'value' in v) return unwrap((v as { value: unknown }).value)
  return null
}

function hashSources(missing: Record<string, string>): string {
  const ordered = Object.keys(missing).sort().map(k => `${k} ${missing[k]}`).join('')
  return crypto.createHash('sha1').update(ordered).digest('hex').slice(0, 16)
}

// Per-language search-intent. English is calibrated for google.com
// vocabulary real foreign buyers actually use, not a calque from RU.
const SEO_INTENT: Record<Lang, string> = {
  en: `SEO INTENT (English / google.com):
Buyers search with patterns like "bali villas for sale", "buy villa in canggu", "off-plan apartment uluwatu", "bali property investment", "bali real estate", "leasehold villa bali", "{project} bali", "{district} apartments for sale". Use that vocabulary naturally.
- Headlines: "{Project} {Type} for Sale in {District}, Bali — {Area} m², {N}-Bedroom" OR "{N}-Bedroom {Type} in {District} Bali — {Project}". Do not start with the type ("Villa Origins…") — that's a calque from Russian.
- Avoid stiff Russian word order. Native English real-estate copy puts project name first when recognised, then type, then location.
- Body may use "for sale", "investment", "ROI", "rental yield", "leasehold", "freehold (PT PMA)", "off-plan", "ready" when they fit the source.
- Don't stuff keywords. Write like a Bali broker email to a Singapore buyer.`,
  zh: `SEO INTENT (Simplified Chinese / google.com.hk + baidu): buyers search "巴厘岛别墅出售", "巴厘岛房产投资", "巴厘岛公寓". Keep Latin Bali district + project names.`,
  fr: `SEO INTENT (French / google.fr): buyers search "villa à vendre bali", "investissement immobilier bali", "appartement bali". Keep Latin Bali district + project names.`,
  de: `SEO INTENT (German / google.de): buyers search "villa kaufen bali", "immobilien investition bali", "wohnung bali". Keep Latin Bali district + project names.`,
}

function systemPromptFor(lang: Lang): string {
  const langName = LANGS[lang].name
  const seo = SEO_INTENT[lang] ?? ''
  return `You are rewriting Russian real-estate marketing copy into ${langName} for balinsky.info, a Bali real-estate catalogue. The user message is a JSON object whose keys are Airtable field names and whose values are Russian source strings. Respond with ONE JSON object: same keys, ${langName} rewrites as values.

This is not a literal translation. Match the search intent and natural phrasing of ${langName}-speaking buyers — see SEO INTENT below.

${seo}

Universal rules:
- Preserve formatting: markdown, line breaks, bullet markers exactly as source.
- Preserve numbers, prices, dates, units. Bali place names (Canggu, Pererenan, Ubud, Uluwatu, Bukit, Nusa Dua, Sanur, Berawa, Batu Bolong, etc.) stay in Latin in every language.
- Project / villa / complex / developer proper names stay in original Latin if already Latin; transliterate Russian-only names into Latin once.
- Headline fields (SEO:Title, ИИ Имя) ≤ 9-word equivalent, no emoji, no trailing punctuation. For English, follow the headline pattern in SEO INTENT.
- SEO:Description: 130-160 chars latin-equivalent, one sentence, factual, naturally include a search keyword like "for sale" / "investment" / "leasehold" where relevant.
- Body / Notes / Описание: natural ${langName} broker tone. Faithful to facts; no invented prices, addresses, claims.
- Developer-category bullet fields rewritten bullet-by-bullet, preserving bullet markers.
- Empty / trivial source → return empty string for that field.`
}

type AzureEnv = { key: string; endpoint: string; version: string; model: string }
async function callAzure(payload: Record<string, string>, lang: Lang, env: AzureEnv): Promise<Record<string, string>> {
  const url = `${env.endpoint.replace(/\/$/, '')}/openai/deployments/${env.model}/chat/completions?api-version=${env.version}`
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': env.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPromptFor(lang) },
            { role: 'user', content: JSON.stringify(payload) },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 5000 * (attempt + 1)))
        continue
      }
      if (!r.ok) throw new Error(`azure ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> }
      const msg = j?.choices?.[0]?.message?.content
      if (!msg) throw new Error('azure: empty response')
      return JSON.parse(msg)
    } catch (e) {
      lastErr = e
      if (attempt < 2) await new Promise(res => setTimeout(res, 1500 * (attempt + 1)))
    }
  }
  throw lastErr ?? new Error('azure: unknown error')
}

type CacheEntry = Record<string, unknown> & { _hash?: string }
type Cache = Record<string, CacheEntry>
// Local alias — the SupabaseClient generic chain otherwise makes the
// route fight the typed-schema generics for no value.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any

async function loadCache(sb: Sb, section: string, lang: Lang): Promise<Cache> {
  const path = `_translations-${section}${LANGS[lang].suffix}.json`
  const { data, error } = await sb.storage.from('feeds').download(path)
  if (error) {
    if (/not found|object not found/i.test(error.message)) return {}
    throw new Error(`download ${path}: ${error.message}`)
  }
  const text = await data.text()
  try { return JSON.parse(text) } catch { return {} }
}

async function saveCache(sb: Sb, section: string, lang: Lang, cache: Cache): Promise<void> {
  const path = `_translations-${section}${LANGS[lang].suffix}.json`
  const { error } = await sb.storage.from('feeds').upload(path, JSON.stringify(cache, null, 2), {
    contentType: 'application/json',
    upsert: true,
    cacheControl: '300',
  })
  if (error) throw new Error(`upload ${path}: ${error.message}`)
}

async function loadFromTable(sb: Sb, table: string) {
  const PAGE = 500
  const rows: Array<{ id: string; data: Record<string, unknown> }> = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb.from(table).select('airtable_id, data').range(offset, offset + PAGE - 1)
    if (error) throw new Error(`select ${table}: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of (data as Array<{ airtable_id: string; data: unknown }>)) {
      rows.push({ id: r.airtable_id, data: (r.data as Record<string, unknown>) || {} })
    }
    if (data.length < PAGE) break
  }
  return rows
}

async function loadFromManifest(url: string, idField: string) {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`)
  const j = await r.json()
  const items = Array.isArray(j.items) ? j.items : Array.isArray(j) ? j : []
  return items.map((it: Record<string, unknown>) => ({ id: it[idField] as string, data: it }))
}

async function runSection(sb: Sb, name: string, cfg: Section, lang: Lang, env: AzureEnv, force = false): Promise<{ translated: number; skipped: number }> {
  const cache = await loadCache(sb, name, lang)
  const rows = cfg.source === 'manifest'
    ? await loadFromManifest(cfg.url!, cfg.idField!)
    : await loadFromTable(sb, cfg.table!)

  const plan: Array<{ id: string; missing: Record<string, string>; hash: string; action: 'new' | 'fill-gaps' | 're-translate' }> = []
  for (const r of rows) {
    if (!r.id) continue
    const d = (r.data as Record<string, unknown>) || {}
    const sources: Record<string, string> = {}
    for (const f of cfg.fields) {
      if (lang === 'en' && cfg.source === 'table') {
        const enRaw = (d as Record<string, unknown>)[`${f} EN`] ?? (d as Record<string, unknown>)[`${f} En`]
        if (unwrap(enRaw)) continue
      }
      const ruText = unwrap((d as Record<string, unknown>)[f])
      if (!ruText) continue
      sources[f] = ruText
    }
    if (Object.keys(sources).length === 0) continue

    const entry = cache[r.id]
    const currentHash = hashSources(sources)
    if (force) {
      plan.push({ id: r.id, missing: sources, hash: currentHash, action: 're-translate' })
      continue
    }
    if (!entry) {
      plan.push({ id: r.id, missing: sources, hash: currentHash, action: 'new' })
      continue
    }
    const cachedHash = entry._hash
    if (!cachedHash) {
      const missing: Record<string, string> = {}
      for (const [f, v] of Object.entries(sources)) {
        if (!entry[f]) missing[f] = v
      }
      if (Object.keys(missing).length > 0) {
        plan.push({ id: r.id, missing, hash: currentHash, action: 'fill-gaps' })
      }
      continue
    }
    if (cachedHash !== currentHash) {
      plan.push({ id: r.id, missing: sources, hash: currentHash, action: 're-translate' })
    }
  }

  let translated = 0
  for (const [i, p] of plan.entries()) {
    try {
      const out = await callAzure(p.missing, lang, env)
      const existing = cache[p.id] || {}
      const merged: CacheEntry = p.action === 're-translate'
        ? { _hash: p.hash }
        : { ...existing, _hash: p.hash }
      for (const f of Object.keys(p.missing)) {
        const v = out?.[f]
        if (typeof v === 'string' && v.trim()) merged[f] = v.trim()
      }
      cache[p.id] = merged
      translated++
      if ((i + 1) % 10 === 0) await saveCache(sb, name, lang, cache)
    } catch (e) {
      console.error(`[translate-cron] ${name}/${lang} ${p.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }
  if (translated > 0) await saveCache(sb, name, lang, cache)
  return { translated, skipped: rows.length - translated }
}

function authOk(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return req.headers.get('authorization') === `Bearer ${expected}`
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const azureKey = process.env.AZURE_OPENAI_API_KEY
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT
  if (!supabaseUrl || !serviceKey || !azureKey || !azureEndpoint) {
    return NextResponse.json({ ok: false, error: 'env_missing' }, { status: 500 })
  }
  const env: AzureEnv = {
    key: azureKey,
    endpoint: azureEndpoint,
    version: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
    model: process.env.AZURE_OPENAI_TRANSLATE_DEPLOYMENT || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-5.4',
  }
  const sb = createClient(supabaseUrl, serviceKey)

  const url = new URL(req.url)
  const langsParam = url.searchParams.get('lang') ?? 'en'
  const langs = langsParam.split(',').map(s => s.trim()).filter((s): s is Lang => s in LANGS)
  if (langs.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_valid_langs' }, { status: 400 })
  }
  const sectionsParam = url.searchParams.get('section')
  const sectionConfig = sections(supabaseUrl)
  const targetSections = sectionsParam
    ? sectionsParam.split(',').map(s => s.trim()).filter(s => s in sectionConfig)
    : Object.keys(sectionConfig)
  const force = url.searchParams.get('force') === 'true'

  const results: Record<string, Record<string, { translated: number; skipped: number; error?: string }>> = {}
  for (const lang of langs) {
    results[lang] = {}
    for (const name of targetSections) {
      try {
        results[lang][name] = await runSection(sb, name, sectionConfig[name], lang, env, force)
      } catch (e) {
        results[lang][name] = { translated: 0, skipped: 0, error: e instanceof Error ? e.message : 'unknown' }
      }
    }
  }

  return NextResponse.json({ ok: true, langs, sections: targetSections, results })
}
