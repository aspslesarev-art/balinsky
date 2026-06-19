#!/usr/bin/env node
// Generate UNIQUE on-page content for each catalog listing + developer:
// a buyer-facing write-up (page_body) + a listing-specific FAQ (faq:[{q,a}]),
// in RU and EN, grounded in the same clean facts as the summary. Stored on the
// assistant_kb row (migration 042). Replaces the thin/duplicate Airtable
// "SEO Text" + templated FAQ that currently render on detail pages.
//
// Idempotent: skips rows that already have page_body unless --force.
// Usage: --dry-run | --sample=N | --only=villa | --force | --conc=8

import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv, villaFacts, apartmentFacts, complexFacts, developerFacts } from './_kb-build.mjs'

loadEnv()
const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null }
const DRY = has('--dry-run'), FORCE = has('--force')
const SAMPLE = val('sample') ? parseInt(val('sample'), 10) : null
const CONC = val('conc') ? parseInt(val('conc'), 10) : 8
const ONLY = val('only') ? val('only').split(',') : ['villa', 'apartment', 'complex', 'developer']

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
const PRICE = { input: 1.25, output: 10.0 }

const KINDS = {
  villa: { table: 'raw_villas', build: villaFacts },
  apartment: { table: 'raw_apartments', build: apartmentFacts },
  complex: { table: 'raw_complexes', build: complexFacts },
  developer: { table: 'raw_developers', build: developerFacts },
}

const SYS_RU = `Ты — Балина, эксперт по недвижимости Бали. По фактам объекта подготовь контент для СТРАНИЦЫ САЙТА (для покупателя/инвестора).
Верни СТРОГО JSON без markdown:
{"body":"...", "faq":[{"q":"...","a":"..."}, ...]}
Требования:
- body: 2 коротких абзаца живого, но честного текста: что это и где, чем интересно, кому подходит, на что обратить внимание. Только по фактам — НИЧЕГО не выдумывай (ни доходность, ни удобства, ни сроки, которых нет). Если цифры в сыром описании противоречат структурным фактам — доверяй структурным. Без воды, без клише, без эмодзи, без ссылок.
- faq: ровно 5 пар вопрос–ответ, которые реально задаёт покупатель про ИМЕННО этот объект (цена, площадь/спальни, лизхолд/статус, район/что рядом, для аренды/проживания). Ответы короткие и только по фактам. Если данных нет — отвечай нейтрально, без выдумок.
- Пиши по-русски.`

const SYS_EN = `Translate this real-estate page content JSON into natural, fluent English for an international buyer. Keep the EXACT same JSON shape {"body":"...","faq":[{"q":"...","a":"..."}]}. Translate values only, keep it concrete and faithful — do not add facts. Return JSON only, no markdown.`

let totalCost = 0, generated = 0, failed = 0, skipped = 0, usageOff = false, consecFail = 0
function track(pt, ct) {
  totalCost += (pt / 1e6) * PRICE.input + (ct / 1e6) * PRICE.output
  if (DRY || usageOff || pt + ct === 0) return
  sb.from('balina_usage').insert({ feature: 'other', deployment: CHAT, prompt_tokens: pt, completion_tokens: ct, audio_seconds: 0, cost_usd: (pt / 1e6) * PRICE.input + (ct / 1e6) * PRICE.output, meta: { job: 'kb-page-content' } }).then(({ error }) => { if (error && !usageOff) { usageOff = true; console.error('  (usage log off:', error.message + ')') } })
}
async function ask(system, user) {
  const r = await ai.chat.completions.create({
    model: CHAT,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.4, max_completion_tokens: 2000, response_format: { type: 'json_object' },
  })
  track(r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0)
  const txt = r.choices[0]?.message?.content?.trim() ?? ''
  return JSON.parse(txt)
}
function validShape(o) { return o && typeof o.body === 'string' && Array.isArray(o.faq) && o.faq.every(x => x && x.q && x.a) }

async function existingWithPage(kind) {
  const set = new Set()
  if (FORCE || SAMPLE) return set
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('assistant_kb').select('ref_id').eq('kind', kind).not('page_body', 'is', null).range(from, from + 999)
    for (const r of data || []) set.add(r.ref_id)
    if (!data || data.length < 1000) break
  }
  return set
}

async function collect(kind) {
  const { table, build } = KINDS[kind]
  const done = await existingWithPage(kind)
  const items = []
  for (let from = 0; from < 20000; from += 200) {
    const { data, error } = await sb.from(table).select('airtable_id, data').range(from, from + 199)
    if (error) { console.error(error.message); break }
    if (!data || !data.length) break
    for (const row of data) {
      const f = build(row)
      if (!f) continue
      if (done.has(f.refId)) { skipped++; continue }
      items.push({ kind, ...f })
      if (SAMPLE && items.length >= SAMPLE) return items
    }
    if (data.length < 200) break
  }
  return items
}

async function processItem(it) {
  const user = `Объект: ${it.title}\n\nФакты:\n${it.factText}`
  const ru = await ask(SYS_RU, user)
  if (!validShape(ru)) throw new Error('bad RU shape')
  const en = await ask(SYS_EN, JSON.stringify(ru))
  if (!validShape(en)) throw new Error('bad EN shape')
  if (DRY) { console.log(`\n--- ${it.kind}: ${it.title} ---\nRU body: ${ru.body.slice(0,200)}…\nRU FAQ[0]: ${ru.faq[0].q} → ${ru.faq[0].a.slice(0,80)}\nEN body: ${en.body.slice(0,120)}…`); generated++; return }
  const { error } = await sb.from('assistant_kb').update({
    page_body: ru.body, faq: ru.faq, page_body_en: en.body, faq_en: en.faq, page_built_at: new Date().toISOString(),
  }).eq('kind', it.kind).eq('ref_id', it.refId)
  if (error) { console.error('  upd err', it.refId, error.message); failed++; return }
  generated++
  if (SAMPLE) console.log(`\n=== ${it.kind}: ${it.title} ===\nBODY(ru):\n${ru.body}\n\nFAQ(ru):\n${ru.faq.map(x=>'• '+x.q+'\n  '+x.a).join('\n')}\n\nBODY(en):\n${en.body}`)
  else process.stdout.write(`\r  ${generated} done, ${failed} failed, ${skipped} skipped — est $${totalCost.toFixed(2)}   `)
}

async function pool(items) {
  let idx = 0, aborted = false
  async function worker() {
    while (idx < items.length && !aborted) {
      const it = items[idx++]
      try { const before = failed; await processItem(it); if (failed > before) { if (++consecFail > 8) { aborted = true; console.error('\n!! ABORT: too many failures') } } else consecFail = 0 }
      catch (e) { failed++; console.error('\n  err', it.refId, e.message); if (++consecFail > 8) { aborted = true; console.error('\n!! ABORT') } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, items.length || 1) }, worker))
}

console.log(`KB page-content — Azure ${CHAT}${DRY?' [DRY]':''}${SAMPLE?` [SAMPLE ${SAMPLE}]`:''}${FORCE?' [FORCE]':''}`)
const start = Date.now()
let all = []
for (const k of ONLY) { if (!KINDS[k]) continue; const items = await collect(k); console.log(`  ${k}: ${items.length} to build`); all = all.concat(items) }
console.log(`Total: ${all.length} (skipped ${skipped} already done)`)
await pool(all)
console.log(`\nDone in ${Math.round((Date.now()-start)/1000)}s — generated ${generated}, failed ${failed} — est $${totalCost.toFixed(2)}`)
if (!DRY) await new Promise(r => setTimeout(r, 1500))
