#!/usr/bin/env node
// Generate editorial DistrictCopy (hero/paragraphs/highlights/bestFor, RU+EN)
// for the LONG TAIL of districts that lib/districts.ts hardcodes only for ~12.
// Grounded in the assistant_kb district guides + real stats. Writes a static
// lib/districts-generated.json that getDistrictCopy() falls back to — so the
// district-intro block AND the commercial "Купить виллу в <район>" title/
// heading/description light up for every district with zero per-page DB calls.
//
// Usage: --dry-run | --force  (idempotent: keeps existing JSON, fills missing)

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv } from './_kb-build.mjs'

loadEnv()
const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run'), FORCE = argv.includes('--force')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'

// Mirror of lib/seo-routes.ts DISTRICT_TO_SLUG (name -> slug) and the hardcoded
// districts in lib/districts.ts (we DON'T override those — they're curated).
const DISTRICT_TO_SLUG = {
  'Batu Bolong': 'batu-bolong', 'Pandawa': 'pandawa', 'Ubud': 'ubud', 'Pererenan': 'pererenan',
  'Seseh': 'seseh', 'Uluwatu': 'uluwatu', 'Nusa Dua': 'nusa-dua', 'Cemagi': 'cemagi',
  'Melasti': 'melasti', 'Berawa': 'berawa', 'Sanur': 'sanur', 'Umalas': 'umalas', 'GWK': 'gwk',
  'Nusa Penida': 'nusa-penida', 'Kedungu': 'kedungu', 'Ungasan': 'ungasan', 'Karanggasem': 'karanggasem',
  'Batu Belig': 'batu-belig', 'Nyanyi': 'nyanyi', 'Kerobokan': 'kerobokan', 'Canggu': 'canggu',
}
const HARDCODED = new Set(['canggu', 'uluwatu', 'ubud', 'sanur', 'pererenan', 'nusa-dua', 'nyanyi', 'melasti', 'kerobokan', 'cemagi', 'umalas', 'berawa'])
const slugOf = name => DISTRICT_TO_SLUG[name] ?? name.toLowerCase()
const usd = n => n == null ? null : '$' + Math.round(n).toLocaleString('en-US')

const SYS = `Ты — Балиса, эксперт по недвижимости Бали. По сводке и цифрам района напиши редакционный блок для SEO-страницы каталога. Опирайся ТОЛЬКО на данные — ничего не выдумывай (доходность не называй, если её нет). Верни СТРОГО JSON без markdown:
{"name_ru":"...","name_en":"...","hero_ru":"...","hero_en":"...","paragraphs_ru":["...","..."],"paragraphs_en":["...","..."],"bestFor_ru":["...","..."],"bestFor_en":["...","..."]}
- name_ru/name_en: название района (ru — кириллицей, корректная транслитерация; en — латиницей).
- hero: 1 ёмкое предложение-позиционирование района для покупателя.
- paragraphs: 2–3 коротких абзаца: что за район, объём и цены предложения (по цифрам), для кого подходит, на что смотреть. Без воды и клише.
- bestFor: 3–4 коротких тега-аудитории (напр. «Под аренду», «Семейное проживание», «Бюджетный вход»). en — перевод.`

function highlights(meta, lang) {
  const h = []
  const push = (ru, en, v) => { if (v != null && v !== '' ) h.push({ label: lang === 'ru' ? ru : en, value: String(v) }) }
  if (meta.villas_for_sale) push('Вилл в продаже', 'Villas for sale', meta.villas_for_sale)
  if (meta.villa_price_median_usd) push('Медиана цены виллы', 'Median villa price', usd(meta.villa_price_median_usd))
  if (meta.apts_for_sale) push('Апартаментов', 'Apartments', meta.apts_for_sale)
  if (meta.apt_price_median_usd) push('Медиана цены апарт.', 'Median apt price', usd(meta.apt_price_median_usd))
  if (meta.complexes) push('Жилых комплексов', 'Complexes', meta.complexes)
  if (meta.rentals) push('Аренда, предложений', 'Rentals listed', meta.rentals)
  return h.slice(0, 5)
}

const PATH = 'lib/districts-generated.json'
let out = {}
try { out = JSON.parse(fs.readFileSync(PATH, 'utf8')) } catch {}

const { data: rows, error } = await sb.from('assistant_kb').select('ref_id, title, meta, summary').eq('kind', 'district')
if (error) { console.error(error.message); process.exit(1) }
console.log(`district kb rows: ${rows.length}`)

let made = 0, skipped = 0, cost = 0
for (const r of rows) {
  const name = r.meta?.district
  if (!name) continue
  const slug = slugOf(name)
  if (HARDCODED.has(slug)) { skipped++; continue }              // curated already
  if (!FORCE && out[slug]) { skipped++; continue }
  const statLines = Object.entries({
    'вилл в продаже': r.meta.villas_for_sale, 'медиана виллы $': r.meta.villa_price_median_usd,
    'апартаментов': r.meta.apts_for_sale, 'медиана апарт. $': r.meta.apt_price_median_usd,
    'комплексов': r.meta.complexes, 'аренда (предложений)': r.meta.rentals,
  }).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join('; ')
  const user = `Район: ${name}\nЦифры: ${statLines}\nСводка: ${r.summary}`
  if (DRY) { console.log(`\n[${slug}] ${name} — stats: ${statLines}`); made++; continue }
  try {
    const resp = await ai.chat.completions.create({ model: CHAT, messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }], temperature: 0.4, max_completion_tokens: 1500, response_format: { type: 'json_object' } })
    const u = resp.usage; cost += ((u?.prompt_tokens ?? 0) / 1e6) * 1.25 + ((u?.completion_tokens ?? 0) / 1e6) * 10
    const j = JSON.parse(resp.choices[0].message.content)
    out[slug] = {
      ru: { slug, name: j.name_ru || name, hero: j.hero_ru, paragraphs: j.paragraphs_ru || [], highlights: highlights(r.meta, 'ru'), bestFor: j.bestFor_ru || [] },
      en: { slug, name: j.name_en || name, hero: j.hero_en, paragraphs: j.paragraphs_en || [], highlights: highlights(r.meta, 'en'), bestFor: j.bestFor_en || [] },
    }
    made++
    process.stdout.write(`\r  generated ${made} — est $${cost.toFixed(2)}   `)
  } catch (e) { console.error('\n  err', slug, e.message) }
}

if (!DRY) { fs.writeFileSync(PATH, JSON.stringify(out, null, 2)); console.log(`\n\nwrote ${PATH}: ${Object.keys(out).length} districts`) }
console.log(`\nDone — generated ${made}, skipped ${skipped} (curated/existing)${DRY ? ' [DRY]' : `, est $${cost.toFixed(2)}`}`)
if (!DRY) await new Promise(r => setTimeout(r, 800))
