#!/usr/bin/env node
// Translate the catalog-hub long-form SEO copy (lib/hub-seo/<kind>/ru.ts) into
// the other nine site languages and write them back as .ts modules.
//
// RU is the source of truth: edit lib/hub-seo/villas/ru.ts (or apartments/ru.ts)
// and re-run this. The generated files are committed — nothing is translated at
// runtime, so the hub pages stay free of per-request cost.
//
//   node scripts/translate-hub-seo.mjs                       # all kinds, all langs
//   node scripts/translate-hub-seo.mjs --kind villas --lang de
//   node scripts/translate-hub-seo.mjs --dry-run             # print, write nothing
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv } from './_kb-build.mjs'

loadEnv()

const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
const AZURE_MODEL = process.env.AZURE_OPENAI_TRANSLATE_DEPLOYMENT || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
if (!AZURE_KEY || !AZURE_ENDPOINT || !AZURE_MODEL) throw new Error('Azure env not set')

const LANGS = {
  en: 'English',
  id: 'Indonesian',
  fr: 'French',
  de: 'German',
  zh: 'Simplified Chinese',
  nl: 'Dutch',
  ban: 'Balinese (Basa Bali, polite register)',
  pl: 'Polish',
  uk: 'Ukrainian',
}
const KINDS = {
  villas: 'villas and houses for sale in Bali',
  apartments: 'apartments and condos for sale in Bali',
  rental: 'villas and apartments for long-term (monthly) rent in Bali',
}

const args = process.argv.slice(2)
const argOf = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const DRY = args.includes('--dry-run')
const onlyKind = argOf('--kind')
const onlyLang = argOf('--lang')
if (onlyKind && !KINDS[onlyKind]) throw new Error(`--kind one of ${Object.keys(KINDS)}`)
if (onlyLang && !LANGS[onlyLang]) throw new Error(`--lang one of ${Object.keys(LANGS)}`)

const ROOT = path.resolve(import.meta.dirname, '..')
const fileFor = (kind, lang) => path.join(ROOT, 'lib', 'hub-seo', kind, `${lang}.ts`)

function systemPrompt(lang, kind) {
  return `You translate landing-page copy for balinsky.info, a Bali real-estate marketplace, from Russian into ${LANGS[lang]}. The page is a catalogue hub for ${KINDS[kind]}.

Return ONE JSON object with EXACTLY the same keys, array lengths and nesting as the input. Never add, drop, merge, reorder or renumber anything.

Rules:
- Translate into natural, professional ${LANGS[lang]} in the voice of a knowledgeable local broker: plain, factual, no marketing fluff, no exclamation marks.
- Keep EVERY number, price, percentage, m², year and count exactly as in the source. Adapt only the thousands separator and currency position to the local convention (e.g. "350 000 $" becomes "$350,000" in English, "350.000 $" in German).
- Keep in Latin script: Bali place names (Canggu, Berawa, Batu Bolong, Pererenan, Ubud, Uluwatu, Pandawa, Melasti, Ungasan, Nusa Dua, Jimbaran, Sanur, Umalas, Seminyak, Nyanyi, Seseh, Cemagi, Bukit) and Indonesian legal terms (Hak Milik, Hak Sewa, Hak Pakai, PT PMA, HGB, PPAT, PBG, SLF, PBB, PPh, BPHTB, RDTR, KITAS, leasehold, freehold, service charge).
- Headings must read like real search-facing headings in ${LANGS[lang]} — keep the buy/price intent ("How much does a villa in Bali cost", "Where to buy…"); do not translate word for word when it sounds unnatural.
- ${lang === 'zh' ? 'Use Simplified Chinese, no plural forms, full-width punctuation.' : lang === 'ban' ? 'Use polite Balinese (basa alus) where natural; keep loanwords where no Balinese term exists.' : 'Use the native professional register.'}
- Return JSON only. No markdown fences, no commentary.`
}

async function callAzure(system, payload) {
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_MODEL}/chat/completions?api-version=${AZURE_VERSION}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AZURE_MODEL,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }],
        }),
      })
      if (!r.ok) {
        if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 2000 * (attempt + 1))); continue }
        throw new Error(`azure ${r.status}: ${(await r.text()).slice(0, 200)}`)
      }
      const j = await r.json()
      const content = j.choices?.[0]?.message?.content
      if (!content) throw new Error('empty completion')
      return JSON.parse(content)
    } catch (err) {
      if (attempt === 2) throw err
      await new Promise(s => setTimeout(s, 2000 * (attempt + 1)))
    }
  }
  throw new Error('unreachable')
}

/** Fail loudly rather than shipping a half-translated hub. */
function assertSameShape(src, out, trail = 'root') {
  if (Array.isArray(src)) {
    if (!Array.isArray(out)) throw new Error(`${trail}: expected array`)
    if (src.length !== out.length) throw new Error(`${trail}: length ${out.length} != ${src.length}`)
    src.forEach((v, i) => assertSameShape(v, out[i], `${trail}[${i}]`))
    return
  }
  if (src && typeof src === 'object') {
    if (!out || typeof out !== 'object') throw new Error(`${trail}: expected object`)
    for (const k of Object.keys(src)) {
      if (!(k in out)) throw new Error(`${trail}.${k}: missing`)
      assertSameShape(src[k], out[k], `${trail}.${k}`)
    }
    return
  }
  if (typeof out !== 'string' || !out.trim()) throw new Error(`${trail}: expected non-empty string`)
}

const banner = (kind, lang) =>
  `// AUTO-GENERATED by scripts/translate-hub-seo.mjs — do not edit by hand.\n` +
  `// Source: lib/hub-seo/${kind}/ru.ts (${LANGS[lang]}).\n`

function serialise(kind, lang, data) {
  return `${banner(kind, lang)}import type { HubLongCopy } from '../types'\n\n` +
    `const copy: HubLongCopy = ${JSON.stringify(data, null, 2)}\n\nexport default copy\n`
}

for (const kind of onlyKind ? [onlyKind] : Object.keys(KINDS)) {
  const src = (await import(pathToFileURL(fileFor(kind, 'ru')).href)).default
  for (const lang of onlyLang ? [onlyLang] : Object.keys(LANGS)) {
    process.stdout.write(`${kind}/${lang} … `)
    const out = await callAzure(systemPrompt(lang, kind), src)
    assertSameShape(src, out)
    if (DRY) { console.log('ok (dry-run)'); continue }
    fs.writeFileSync(fileFor(kind, lang), serialise(kind, lang, out))
    console.log('written')
  }
}
