#!/usr/bin/env node
// Тот же vision-разбор, что и по рынку аренды (scripts/booking-vision.mjs),
// но по НАШЕМУ каталогу продажи: виллы, апартаменты, ЖК застройщиков.
//
// Смысл только в паре: рынок аренды даёт «за какие признаки продукта платят
// деньгами», каталог — «что застройщики реально строят». Обе стороны должны
// быть размечены ОДНИМ словарём (scripts/_product-vision.mjs), иначе сравнение
// превращается в подгонку.
//
// Вход:  <bucket>/_manifest.json  { airtable_id: [photo urls] }
// Выход: <bucket>/_product-vision.json { airtable_id: { vision, photos_used, model, analyzed_at } }
//
// Usage:
//   node scripts/catalog-vision.mjs --dry-run --sample=3 --only=complex
//   node scripts/catalog-vision.mjs --only=complex,villa,apartment --conc=20
//
// Платно (OpenAI), --dry-run тоже: он зовёт модель, только не пишет манифест.
// Без --yes-paid скрипт печатает число объектов и останавливается до запросов.

import { createClient } from '@supabase/supabase-js'
import { chat, chatModel, requirePaid } from './_openai.mjs'
import { loadEnv } from './_kb-build.mjs'
import { VISION_SCHEMA, visionSystemPrompt, pickPhotos } from './_product-vision.mjs'

loadEnv()

const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null }

const DRY = has('--dry-run')
const FORCE = has('--force')
const SAMPLE = val('sample') ? parseInt(val('sample'), 10) : null
const CONC = val('conc') ? parseInt(val('conc'), 10) : 12
const MAXPHOTOS = val('maxphotos') ? parseInt(val('maxphotos'), 10) : 6
const ONLY = val('only') ? val('only').split(',') : ['complex', 'villa', 'apartment']

// Ставки Azure gpt-5.4 (июль 2026) — для OpenAI только оценка.
const PRICE_IN = 2.50 / 1e6
const PRICE_OUT = 15.00 / 1e6
const BUCKETS = { villa: 'villa-photos', apartment: 'apartment-photos', complex: 'complex-photos' }
const OUT_KEY = '_product-vision.json'

// ЖК — это в основном рендеры проекта, виллы/апартаменты чаще уже построены.
const CONTEXT = {
  complex: 'residential complex in Bali offered by a developer (photos may be renders)',
  villa: 'villa in Bali offered for sale',
  apartment: 'apartment in Bali offered for sale',
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MODEL = chatModel()

let done = 0, failed = 0, tokIn = 0, tokOut = 0
const started = Date.now()
const cost = () => tokIn * PRICE_IN + tokOut * PRICE_OUT
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pauseUntil = 0

async function analyze(urls, kind) {
  const content = [{ type: 'text', text: `Analyze these ${urls.length} photos of one listing.` }]
  for (const u of urls) content.push({ type: 'image_url', image_url: { url: u } })
  const r = await chat({
    model: MODEL,
    messages: [{ role: 'system', content: visionSystemPrompt(CONTEXT[kind]) }, { role: 'user', content }],
    temperature: 0.1,
    max_completion_tokens: 900,
    response_format: { type: 'json_schema', json_schema: { name: 'listing_vision', strict: true, schema: VISION_SCHEMA } },
  })
  tokIn += r.usage?.prompt_tokens ?? 0
  tokOut += r.usage?.completion_tokens ?? 0
  return JSON.parse(r.choices[0].message.content)
}

function dropBrokenUrl(urls, message) {
  const m = /Failed to download image from (\S+)/.exec(message ?? '')
  if (!m) return null
  const bad = m[1].replace(/[.,]$/, '')
  const rest = urls.filter(u => !u.startsWith(bad.slice(0, 80)))
  return rest.length >= 3 && rest.length < urls.length ? rest : null
}

async function analyzeWithRetry(urls, kind) {
  let list = urls
  let lastErr
  for (let attempt = 0; attempt < 7; attempt++) {
    while (Date.now() < pauseUntil) await sleep(Math.min(2000, pauseUntil - Date.now()))
    try { return await analyze(list, kind) } catch (e) {
      lastErr = e
      const status = e?.status ?? e?.response?.status
      if (status === 400) {
        const pruned = dropBrokenUrl(list, e.message)
        if (!pruned) throw e
        list = pruned
        continue
      }
      if (status === 429) {
        pauseUntil = Math.max(pauseUntil, Date.now() + Math.min(45000, 4000 * 2 ** attempt) + Math.random() * 1500)
        continue
      }
      if (status && status < 500) throw e
      await sleep(2000 * (attempt + 1))
    }
  }
  throw lastErr
}

async function downloadManifest(bucket, key) {
  const { data, error } = await sb.storage.from(bucket).download(key)
  if (error) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}

async function uploadManifest(bucket, key, obj) {
  const { error } = await sb.storage.from(bucket).upload(key, JSON.stringify(obj), { contentType: 'application/json', upsert: true })
  if (error) console.error('  upload err', bucket, error.message)
}

// План (бесплатно): только чтение Storage.
async function planKind(kind) {
  const bucket = BUCKETS[kind]
  if (!bucket) return null
  console.log(`\n=== ${kind} (${bucket}) ===`)
  const photos = await downloadManifest(bucket, '_manifest.json')
  if (!photos) { console.error('  нет _manifest.json'); return null }
  const out = FORCE ? {} : (await downloadManifest(bucket, OUT_KEY)) ?? {}
  const ids = Object.keys(photos).filter(id => (photos[id]?.length ?? 0) >= 3)
  const todo = ids.filter(id => FORCE || !out[id]?.vision)
  const work = SAMPLE ? todo.slice(0, SAMPLE) : todo
  console.log(`  ${ids.length} с фото, ${work.length} к разбору`)
  return { kind, bucket, photos, out, work }
}

async function runKind({ kind, bucket, photos, out, work }) {
  console.log(`\n=== ${kind}: разбор ${work.length} ===`)
  let idx = 0
  const worker = async () => {
    while (idx < work.length) {
      const id = work[idx++]
      const urls = pickPhotos(photos[id], MAXPHOTOS)
      if (urls.length < 3) { failed++; continue }
      try {
        const vision = await analyzeWithRetry(urls, kind)
        if (DRY) console.log(`\n[${id}]`, JSON.stringify(vision))
        else out[id] = { vision, photos_used: urls.length, model: MODEL, analyzed_at: new Date().toISOString() }
        done++
        process.stdout.write(`\r  ${done} готово, ${failed} ошибок — $${cost().toFixed(2)}   `)
      } catch (e) {
        failed++
        console.error(`\n  err ${id}: ${String(e.message).slice(0, 140)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, work.length || 1) }, worker))
  if (!DRY && work.length) {
    await uploadManifest(bucket, OUT_KEY, out)
    console.log(`\n  залито ${bucket}/${OUT_KEY} (${Object.keys(out).length} объектов)`)
  }
}

console.log(`catalog-vision — OpenAI ${MODEL}${DRY ? ' [DRY]' : ''} conc=${CONC} maxphotos=${MAXPHOTOS}`)
const plans = []
for (const kind of ONLY) { const plan = await planKind(kind); if (plan) plans.push(plan) }
requirePaid({ what: `разбор фото каталога (до ${MAXPHOTOS} на объект) моделью ${MODEL}`, items: plans.reduce((a, p) => a + p.work.length, 0) })
for (const plan of plans) await runKind(plan)
console.log(`\nDone: ${done} разобрано, ${failed} ошибок, ${Math.round((Date.now() - started) / 1000)}s — $${cost().toFixed(2)}`)
