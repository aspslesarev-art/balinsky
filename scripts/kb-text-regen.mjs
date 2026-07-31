#!/usr/bin/env node
// Marketing copy regeneration for listings (Azure gpt-5.4 / gpt-5.4-pro).
// Generates N independent variants per listing, then a judge call picks the
// best one. Facts come from _kb-build.mjs (which already strips the known-bad
// fields: bogus yields, apartment price/m² off by 30×), enriched with what the
// vision pass actually SAW in the photos.
//
// Output → NEW Storage manifest, nothing touches raw_* or the live site:
//   <bucket>/_texts.json
//   { [airtable_id]: { lang, model, variants: [...], best, judge_reason, at } }
// Wiring it into the pages is a separate, credit-free code change.
//
// Usage: --dry-run | --limit=N | --only=villa | --force | --conc=4
//        --variants=3 | --pro | --checkpoint=25

import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv, villaFacts, apartmentFacts, complexFacts } from './_kb-build.mjs'

loadEnv()
const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null }
const DRY = has('--dry-run'), FORCE = has('--force'), PRO = has('--pro')
const LIMIT = val('limit') ? parseInt(val('limit'), 10) : null
const CONC = val('conc') ? parseInt(val('conc'), 10) : 4
const VARIANTS = val('variants') ? parseInt(val('variants'), 10) : 3
const CHECKPOINT = val('checkpoint') ? parseInt(val('checkpoint'), 10) : 25
const ONLY = val('only') ? val('only').split(',') : ['villa', 'apartment', 'complex']
const EFFORT = val('effort') ?? 'medium'
// Separate output file lets a pro run sit alongside the standard one for
// side-by-side comparison instead of overwriting it.
const OUT_KEY = val('out') ?? '_texts.json'

// Rates read off Cost Management 2026-07. pro output is 12× the standard model,
// so the variant count is the main budget lever.
const RATES = {
  standard: { in: 2.5, out: 15 },
  pro: { in: 30, out: 180 },
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
// gpt-5.4-pro only answers on the Responses API — chat.completions returns
// "400 The requested operation is unsupported" — and it rejects `temperature`.
const ai = PRO
  ? new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_PRO_API_KEY, endpoint: process.env.AZURE_OPENAI_PRO_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_PRO_API_VERSION ?? '2025-04-01-preview' })
  : new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
const MODEL = PRO ? (process.env.AZURE_OPENAI_PRO_DEPLOYMENT ?? 'gpt-5.4-pro') : (process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4')
const RATE = PRO ? RATES.pro : RATES.standard

const SOURCES = {
  villa: { table: 'raw_villas', bucket: 'villa-photos', facts: villaFacts },
  apartment: { table: 'raw_apartments', bucket: 'apartment-photos', facts: apartmentFacts },
  complex: { table: 'raw_complexes', bucket: 'complex-photos', facts: complexFacts },
}

// Search demand for these pages is transactional and villa-first ("купить
// виллу", "сколько стоит"); the existing copy is skewed into an investment
// frame that the RU audience is not actually searching for. New copy sells the
// property, not a yield story.
const WRITER_SYSTEM = `Ты — редактор русскоязычного маркетплейса недвижимости Бали balinsky.info. Пишешь текст карточки объекта для покупателя, который выбирает, что купить.

Пиши строгий JSON без markdown:
{
  "title": "<SEO-заголовок, до 60 символов, с типом объекта и районом>",
  "meta": "<meta description, 140-155 символов, с конкретикой и призывом посмотреть объект>",
  "lead": "<1-2 предложения, главное преимущество именно этого объекта>",
  "body": ["<абзац>", "<абзац>", "<абзац>"],
  "faq": [{"q": "<вопрос покупателя>", "a": "<ответ 1-3 предложения>"}]
}

Правила:
- Опирайся ТОЛЬКО на факты из блока FACTS и на то, что реально видно на фото (блок PHOTOS). Ничего не выдумывай: нет данных — не упоминай.
- Никаких обещаний доходности, процентов, гарантий возврата и слов «инвестиция окупится». Если в фактах есть заявленная доходность, максимум — «застройщик заявляет ~X%», без собственных прогнозов.
- Тон: спокойный, предметный, без рекламных штампов («райский уголок», «жемчужина острова», «не упустите шанс») и без восклицательных знаков.
- body: 3-4 абзаца по 2-4 предложения. Первый — про сам объект, дальше — планировка/состояние, район и практика жизни, условия покупки (leasehold/сдача), если они известны.
- faq: 3-5 пар. Вопросы — те, что реально задаёт покупатель (что входит в цену, какой срок аренды земли, когда сдача, что рядом, можно ли сдавать).
- Каждый текст должен быть уникален для этого объекта: используй его цифры, район и то, что видно на фото. Никаких шаблонов, применимых к любому листингу.
- НИКОГДА не ссылайся на источник данных. Запрещены обороты «в фактах указано», «по данным выше», «согласно описанию», «на фото видно», «в карточке сказано». Читатель не знает ни про какие факты и фото-анализ — пиши так, будто это твоё собственное знание об объекте.
- Названия районов склоняй по-русски и естественно: «в Убуде», «в Чангу», «в Семиньяке», а не «в Ubud». Латиницу оставляй только для названий комплексов и застройщиков.`

const JUDGE_SYSTEM = `Ты — главный редактор. Тебе дают несколько вариантов текста для ОДНОЙ карточки недвижимости. Выбери лучший и верни строгий JSON: {"best": <индекс с 0>, "reason": "<до 15 слов>"}.
Критерии по убыванию важности: фактическая точность (ничего не выдумано сверх FACTS), конкретность вместо общих слов, отсутствие обещаний доходности, читаемость, соответствие длин (title ≤60, meta 140-155).`

let cost = 0, made = 0, failed = 0, skipped = 0, usageOff = false, consec = 0

function track(pt, ct) {
  const usd = (pt / 1e6) * RATE.in + (ct / 1e6) * RATE.out
  cost += usd
  if (DRY || usageOff || pt + ct === 0) return
  sb.from('balina_usage').insert({ feature: 'other', deployment: MODEL, prompt_tokens: pt, completion_tokens: ct, audio_seconds: 0, cost_usd: usd, meta: { job: 'kb-text-regen' } })
    .then(({ error }) => { if (error && !usageOff) { usageOff = true; console.error('  (usage log off)') } })
}

const RETRIES = 3
const isTransient = msg => /timed out|timeout|429|500|502|503|504|ECONNRESET|fetch failed/i.test(msg ?? '')

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    meta: { type: 'string' },
    lead: { type: 'string' },
    body: { type: 'array', items: { type: 'string' } },
    faq: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'], additionalProperties: false } },
  },
  required: ['title', 'meta', 'lead', 'body', 'faq'],
  additionalProperties: false,
}
const JUDGE_SCHEMA = {
  type: 'object',
  properties: { best: { type: 'integer' }, reason: { type: 'string' } },
  required: ['best', 'reason'],
  additionalProperties: false,
}

async function callOnce(system, user, maxTokens, temperature, schema, schemaName) {
  if (PRO) {
    // pro is a reasoning model: thinking tokens are billed as output ($180/M)
    // and eat the same max_output_tokens budget, so a tight cap returns
    // `incomplete` before any text is produced. Keep the cap generous and let
    // --effort be the actual cost lever.
    const r = await ai.responses.create({
      model: MODEL,
      instructions: system,
      input: [{ role: 'user', content: user }],
      max_output_tokens: maxTokens * 4,
      reasoning: { effort: EFFORT },
      text: { format: { type: 'json_schema', name: schemaName, strict: true, schema } },
    })
    track(r.usage?.input_tokens ?? 0, r.usage?.output_tokens ?? 0)
    if (r.status === 'incomplete') throw new Error(`incomplete: ${r.incomplete_details?.reason ?? 'unknown'}`)
    return JSON.parse(r.output_text)
  }
  const r = await ai.chat.completions.create({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature, max_completion_tokens: maxTokens, response_format: { type: 'json_object' } })
  track(r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0)
  return JSON.parse(r.choices[0].message.content)
}

async function ask(system, user, maxTokens, temperature, schema, schemaName) {
  let lastError = null
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await callOnce(system, user, maxTokens, temperature, schema, schemaName)
    } catch (e) {
      lastError = e
      if (!isTransient(e.message) || attempt === RETRIES) throw e
      await new Promise(res => setTimeout(res, 1500 * attempt))
    }
  }
  throw lastError
}

// What the vision pass actually saw beats what the source description claims.
function photoContext(vision) {
  if (!vision) return null
  const f = vision.features ?? {}
  const bits = []
  if (f.pool) bits.push(`бассейн${f.pool_type ? ` (${f.pool_type})` : ''}`)
  if (f.view?.length) bits.push(`вид: ${f.view.join(', ')}`)
  if (f.outdoor?.length) bits.push(`снаружи: ${f.outdoor.join(', ')}`)
  if (f.amenities?.length) bits.push(`удобства: ${f.amenities.join(', ')}`)
  if (f.style) bits.push(`стиль: ${f.style}`)
  if (f.condition) bits.push(`состояние: ${f.condition}`)
  if (typeof f.furnished === 'boolean') bits.push(f.furnished ? 'с мебелью' : 'без мебели')
  const alt = (vision.alt_ru ?? []).slice(0, 6).filter(Boolean)
  if (alt.length) bits.push(`кадры: ${alt.join('; ')}`)
  return bits.length ? bits.join('\n') : null
}

function buildUserPrompt(facts, vision) {
  const photos = photoContext(vision)
  return `FACTS:\n${facts.factText}\n\nPHOTOS:\n${photos ?? '(фото не проанализированы — не описывай то, чего нет в FACTS)'}`
}

// pro rejects `temperature`, so variety comes from giving each variant a
// different editorial angle — which separates them more than sampling noise.
const ANGLES = [
  'Веди от самого объекта: планировка, площади, состояние, что видно на фото.',
  'Веди от района и практики жизни: что рядом, как добираться, кому подойдёт локация.',
  'Веди от условий сделки: цена, что входит, срок leasehold, стадия готовности и сроки сдачи.',
  'Веди от сценария использования: как в этом объекте реально живут или кому его сдают.',
]

async function generate(facts, vision) {
  const base = buildUserPrompt(facts, vision)
  const variants = []
  for (let i = 0; i < VARIANTS; i++) {
    const user = `${base}\n\nРАКУРС ЭТОГО ВАРИАНТА: ${ANGLES[i % ANGLES.length]}`
    const j = await ask(WRITER_SYSTEM, user, 3000, 0.5 + i * 0.2, COPY_SCHEMA, 'listing_copy')
    if (j?.title && j?.body) variants.push(j)
  }
  if (!variants.length) throw new Error('no usable variant')
  if (variants.length === 1) return { variants, best: 0, judge_reason: 'единственный вариант' }

  const list = variants.map((v, i) => `### ВАРИАНТ ${i}\n${JSON.stringify(v)}`).join('\n\n')
  const verdict = await ask(JUDGE_SYSTEM, `FACTS:\n${facts.factText}\n\n${list}`, 600, 0.1, JUDGE_SCHEMA, 'judge_verdict')
  const best = Number.isInteger(verdict?.best) && verdict.best >= 0 && verdict.best < variants.length ? verdict.best : 0
  return { variants, best, judge_reason: String(verdict?.reason ?? '').slice(0, 120) || null }
}

async function downloadManifest(bucket, key) {
  const { data, error } = await sb.storage.from(bucket).download(key)
  if (error) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}
async function uploadManifest(bucket, key, obj) {
  const { error } = await sb.storage.from(bucket).upload(key, JSON.stringify(obj), { contentType: 'application/json', upsert: true })
  if (error) console.error('  upload err', bucket, error.message)
  return !error
}

async function processKind(kind) {
  const { table, bucket, facts: factsOf } = SOURCES[kind]
  console.log(`\n=== ${kind} (${table}) ===`)
  const { data: rows, error } = await sb.from(table).select('airtable_id, data')
  if (error) { console.error('  load err', error.message); return }

  const vision = (await downloadManifest(bucket, '_vision.json')) ?? {}
  const existing = (await downloadManifest(bucket, OUT_KEY)) ?? {}
  const candidates = rows.map(r => ({ id: r.airtable_id, facts: factsOf(r) })).filter(c => c.facts)
  const todo = candidates.filter(c => FORCE || !existing[c.id])
  skipped += candidates.length - todo.length
  const work = LIMIT ? todo.slice(0, LIMIT) : todo
  console.log(`  ${candidates.length} listings, ${work.length} to write, ${candidates.length - todo.length} already done`)
  if (!work.length) return

  const results = new Map()
  const merged = () => Object.fromEntries(
    [...new Set([...Object.keys(existing), ...results.keys()])]
      .map(id => [id, results.get(id) ?? existing[id]])
  )

  let idx = 0, aborted = false, sinceCheckpoint = 0
  async function worker() {
    while (idx < work.length && !aborted) {
      const { id, facts } = work[idx++]
      try {
        const { variants, best, judge_reason } = await generate(facts, vision[id])
        made++; consec = 0
        const record = { lang: 'ru', model: MODEL, variants, best, judge_reason, at: new Date().toISOString().slice(0, 10) }
        if (DRY) { const v = variants[best]; console.log(`\n[${id}] ${facts.slug}\n  title: ${v.title}\n  meta:  ${v.meta}\n  lead:  ${v.lead}\n  body:  ${v.body?.length} абз., faq: ${v.faq?.length} — выбран ${best} (${judge_reason})`); continue }
        results.set(id, record)
        if (++sinceCheckpoint >= CHECKPOINT) { sinceCheckpoint = 0; await uploadManifest(bucket, OUT_KEY, merged()) }
        process.stdout.write(`\r  ${made} written, ${failed} failed — $${cost.toFixed(2)}   `)
      } catch (e) {
        failed++
        console.error('\n  err', id, e.message)
        if (++consec > 6) { aborted = true; console.error('!! ABORT — too many consecutive failures') }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, work.length) }, worker))
  if (!DRY && results.size > 0) {
    const ok = await uploadManifest(bucket, OUT_KEY, merged())
    console.log(`\n  ${ok ? 'uploaded' : 'FAILED to upload'} ${bucket}/${OUT_KEY} (+${results.size})`)
  }
}

console.log(`KB text regen — ${MODEL}${DRY ? ' [DRY]' : ''}${FORCE ? ' [FORCE]' : ''} variants=${VARIANTS} conc=${CONC}${LIMIT ? ` limit=${LIMIT}` : ''}`)
const start = Date.now()
for (const k of ONLY) { if (SOURCES[k]) await processKind(k) }
console.log(`\nDone in ${Math.round((Date.now() - start) / 1000)}s — written ${made}, failed ${failed}, skipped ${skipped} — spent $${cost.toFixed(2)}`)
if (!DRY) await new Promise(r => setTimeout(r, 1200))
