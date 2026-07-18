#!/usr/bin/env node
// Aggregate knowledge layer for Балиса: per-district investor guides + a
// market overview, generated from REAL numbers across the catalog + rentals
// and written up by Azure OpenAI. Stored in assistant_kb as kind='district'
// / kind='market', so kb_search surfaces them alongside listings.
//
// These answer the questions individual listings can't: "what's Canggu vs
// Ubud for rental yield", "where can I buy a villa under $250k", "typical
// price per m² in Berawa", "is there monthly rental in Uluwatu".
//
// Run AFTER kb-summarize (independent of it, but logically the macro layer).
//   node scripts/kb-aggregates.mjs            # build + embed district/market docs
//   node scripts/kb-aggregates.mjs --dry-run  # print stats + prompts, 0 tokens

import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv, sha1, villaFacts, apartmentFacts, complexFacts, SITE_URL } from './_kb-build.mjs'

loadEnv()
const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
const MIN_LISTINGS = 3

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
})
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
const EMBED = process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT ?? 'text-embedding-3-large'
const DIMS = 1536

// Normalize "Canggu (Tibubeneng)" / " Berawa " → "Canggu" / "Berawa".
function normDistrict(s) {
  if (!s) return null
  return s.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim() || null
}
function median(arr) {
  const a = arr.filter(x => x != null && Number.isFinite(x)).sort((x, y) => x - y)
  if (!a.length) return null
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2)
}
const usd = n => n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US')

async function loadTable(table, build, kind) {
  const out = []
  const PAGE = 200
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await sb.from(table).select('airtable_id, data').range(from, from + PAGE - 1)
    if (error) { console.error(table, error.message); break }
    if (!data || !data.length) break
    for (const row of data) { const f = build(row); if (f) out.push(f) }
    if (data.length < PAGE) break
  }
  return out
}

async function loadRentals() {
  const { data, error } = await sb.storage.from('rental').download('_rental.json')
  if (error) { console.error('rental manifest:', error.message); return [] }
  const arr = JSON.parse(await data.text())
  return Array.isArray(arr) ? arr : (arr.items || arr.rentals || arr.listings || [])
}

console.log('KB aggregates — building district + market knowledge')
const [villas, apts, complexes, rentals] = await Promise.all([
  loadTable('raw_villas', villaFacts, 'villa'),
  loadTable('raw_apartments', apartmentFacts, 'apartment'),
  loadTable('raw_complexes', complexFacts, 'complex'),
  loadRentals(),
])
console.log(`Loaded: ${villas.length} villas, ${apts.length} apts, ${complexes.length} complexes, ${rentals.length} rentals`)

// Group everything by normalized district.
const D = new Map()
function bucket(dist) {
  const key = normDistrict(dist)
  if (!key) return null
  if (!D.has(key)) D.set(key, { key, villaPrices: [], villaPPSqm: [], aptPrices: [], aptPPSqm: [], beds: [], complexes: 0, rentalPrices: [], rentalCount: 0 })
  return D.get(key)
}
for (const v of villas) { const b = bucket(v.meta.district); if (!b) continue; if (v.meta.price_usd) b.villaPrices.push(v.meta.price_usd); if (v.meta.price_per_sqm_usd) b.villaPPSqm.push(v.meta.price_per_sqm_usd); if (v.meta.bedrooms) b.beds.push(v.meta.bedrooms) }
for (const a of apts) { const b = bucket(a.meta.district); if (!b) continue; if (a.meta.price_usd) b.aptPrices.push(a.meta.price_usd); if (a.meta.price_per_sqm_usd) b.aptPPSqm.push(a.meta.price_per_sqm_usd); if (a.meta.bedrooms) b.beds.push(a.meta.bedrooms) }
for (const c of complexes) { const b = bucket(c.meta.district); if (b) b.complexes++ }
for (const r of rentals) { const b = bucket(r.location); if (!b) continue; b.rentalCount++; const rp = Number(r.priceMonthUsd); if (rp >= 100 && rp <= 50000) b.rentalPrices.push(rp) }

function statsBlock(b) {
  const L = []
  const vcount = b.villaPrices.length, acount = b.aptPrices.length
  L.push(`Район: ${b.key}`)
  L.push(`Виллы на продажу: ${vcount}${vcount ? ` (цена ${usd(Math.min(...b.villaPrices))}–${usd(Math.max(...b.villaPrices))}, медиана ${usd(median(b.villaPrices))}, медиана $/м² ${usd(median(b.villaPPSqm))})` : ''}`)
  L.push(`Апартаменты на продажу: ${acount}${acount ? ` (цена ${usd(Math.min(...b.aptPrices))}–${usd(Math.max(...b.aptPrices))}, медиана ${usd(median(b.aptPrices))}, медиана $/м² ${usd(median(b.aptPPSqm))})` : ''}`)
  L.push(`Жилых комплексов: ${b.complexes}`)
  const beds = b.beds.length ? median(b.beds) : null
  if (beds != null) L.push(`Типичная спальность: ${beds}`)
  L.push(`Помесячная аренда: ${b.rentalCount} предложений${b.rentalPrices.length ? ` ($${Math.min(...b.rentalPrices)}–$${Math.max(...b.rentalPrices)}/мес, медиана $${median(b.rentalPrices)})` : ''}`)
  return L.join('\n')
}

const DISTRICT_SYSTEM = `Ты — Балиса, эксперт по рынку недвижимости Бали для русскоязычных инвесторов.
Тебе дают РЕАЛЬНУЮ статистику по району из нашей базы (объём предложения, цены, аренда). Напиши компактный инвест-гайд района (5–8 предложений) для внутренней базы знаний.
Требования: по-русски, конкретно, опираясь ТОЛЬКО на цифры из статистики (ничего не выдумывай про доходность/инфраструктуру, чего нет в данных — общеизвестный географический контекст Бали допустим, но без выдуманных чисел). Передай: ценовое позиционирование района, объём и ликвидность предложения (много/мало), для какого инвестора подходит (бюджет входа, под аренду/проживание), соотношение продажи и аренды. Без приветствий, ссылок и эмодзи. Включай естественные ключевые слова, по которым ищут (название района, "вилла под аренду", "апартаменты до $X" и т.п.).`

const MARKET_SYSTEM = `Ты — Балиса, эксперт по рынку недвижимости Бали. Тебе дают сводную статистику по районам из нашей базы. Напиши краткий обзор рынка (6–10 предложений) для внутренней базы знаний: какие районы самые ёмкие по предложению, диапазоны цен, где дешевле/дороже вход, где силён сегмент аренды. По-русски, только по цифрам, без выдумок, без ссылок и эмодзи.`

async function summarizeDoc(system, user) {
  const r = await ai.chat.completions.create({
    model: CHAT,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.3, max_completion_tokens: 1500,
  })
  return r.choices[0]?.message?.content?.trim() ?? ''
}
async function embed(text) {
  const r = await ai.embeddings.create({ model: EMBED, input: [text.slice(0, 8000)], dimensions: DIMS })
  return r.data[0].embedding
}

const districts = [...D.values()]
  .filter(b => (b.villaPrices.length + b.aptPrices.length) >= MIN_LISTINGS || b.rentalCount >= MIN_LISTINGS)
  .sort((a, b) => (b.villaPrices.length + b.aptPrices.length + b.rentalCount) - (a.villaPrices.length + a.aptPrices.length + a.rentalCount))
console.log(`Districts worth a guide: ${districts.length}`)

let done = 0
for (const b of districts) {
  const stats = statsBlock(b)
  if (DRY) { console.log(`\n--- district: ${b.key} ---\n${stats}`); done++; continue }
  try {
    const summary = await summarizeDoc(DISTRICT_SYSTEM, `Статистика по району:\n${stats}\n\nНапиши инвест-гайд района.`)
    if (!summary) { console.error('  empty', b.key); continue }
    const vec = await embed(summary)
    const { error } = await sb.from('assistant_kb').upsert({
      kind: 'district', ref_id: `district:${b.key.toLowerCase()}`, slug: null, title: `Район ${b.key}`,
      summary, embedding: '[' + vec.join(',') + ']', embedding_text: summary,
      meta: { district: b.key, villas_for_sale: b.villaPrices.length, apts_for_sale: b.aptPrices.length, complexes: b.complexes, rentals: b.rentalCount, villa_price_median_usd: median(b.villaPrices), apt_price_median_usd: median(b.aptPrices), url: `${SITE_URL}/ru/villy?district=${encodeURIComponent(b.key)}` },
      source_hash: sha1(stats), embedded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'kind,ref_id' })
    if (error) { console.error('  upsert', b.key, error.message); continue }
    done++; process.stdout.write(`\r  districts: ${done}/${districts.length}   `)
  } catch (e) { console.error('\n  err', b.key, e.message) }
}
console.log()

// Market overview.
const overviewStats = districts.slice(0, 25).map(statsBlock).join('\n\n')
if (DRY) { console.log(`\n--- market overview stats (top 25 districts) ---\n${overviewStats.slice(0, 1500)}…`) }
else {
  try {
    const summary = await summarizeDoc(MARKET_SYSTEM, `Сводная статистика по районам Бали:\n${overviewStats}\n\nНапиши обзор рынка.`)
    if (summary) {
      const vec = await embed(summary)
      await sb.from('assistant_kb').upsert({
        kind: 'market', ref_id: 'market:overview', slug: null, title: 'Обзор рынка недвижимости Бали',
        summary, embedding: '[' + vec.join(',') + ']', embedding_text: summary,
        meta: { districts: districts.length }, source_hash: sha1(overviewStats),
        embedded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'kind,ref_id' })
      console.log('  market overview: done')
    }
  } catch (e) { console.error('  market err', e.message) }
}

console.log(`\nDone — ${done} district guides${DRY ? ' (dry)' : ''}`)
if (!DRY) await new Promise(r => setTimeout(r, 1000))
