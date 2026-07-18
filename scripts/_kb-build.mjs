// Shared helpers for the assistant_kb knowledge-base build pipeline.
//
// The raw_* JSONB is noisy: Airtable computed fields arrive as
// { state, value, isStale, errorType } objects, formula errors as
// state:'error', and there is lots of SEO/HTML junk. These helpers pull
// CLEAN investor-relevant facts out of a row so the LLM summarizer (and the
// rentals direct-embed path) work from signal, not noise.
//
// Used by: scripts/kb-summarize.mjs, scripts/kb-embed.mjs, scripts/kb-aggregates.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'

export const SITE_URL = 'https://balinsky.info'

export function loadEnv() {
  try {
    for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
      const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  } catch { /* env may already be present */ }
}

// First non-empty scalar. Unwraps Airtable computed-field objects
// ({state,value}) and arrays; treats state:'error' / null as empty.
export function fs1(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null
  if (Array.isArray(v)) { for (const x of v) { const r = fs1(x); if (r) return r } return null }
  if (typeof v === 'object') {
    if (v.state === 'error') return null
    if ('value' in v) return fs1(v.value)
    if ('name' in v) return fs1(v.name)
  }
  return null
}

export function num1(v) {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') { const n = Number(v.replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v)) { for (const x of v) { const r = num1(x); if (r != null) return r } return null }
  if (typeof v === 'object') { if (v.state === 'error') return null; if ('value' in v) return num1(v.value) }
  return null
}

// Drop raw Airtable record-id leftovers ("rec…") that sometimes land in
// link fields instead of a resolved label.
function notRecId(s) { return s && !/^rec[A-Za-z0-9]{14,}$/.test(s) ? s : null }

// Keep a yield only if it reads like a real annual % (1–30). Bali data has
// fields that store $ income or formula errors under "yield" labels.
function plausibleYield(n) {
  if (n == null) return null
  const v = n > 1 ? n : n * 100 // tolerate fractional (0.12 → 12)
  return v >= 1 && v <= 30 ? Math.round(v * 10) / 10 : null
}

export function cleanDistrict(d) {
  // Villas store these as arrays (["Ubud"]) and 'Location filter' is a
  // linked-record id (["rec…"]). Walk sources, skipping rec-id values, and
  // prefer the granular 'Location 2' (Berawa/Melasti) over 'Location' (Canggu).
  for (const key of ['Location 2', 'Location', 'Location filter']) {
    const v = notRecId(fs1(d[key]))
    if (v) return v
  }
  return null
}

export function sha1(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16) }

// Truncate a description to keep token cost bounded while preserving signal.
function descExcerpt(...vals) {
  for (const v of vals) {
    const s = fs1(v)
    if (s && s.length > 40 && !/^<!?[a-z]/i.test(s)) return s.replace(/\s+/g, ' ').trim().slice(0, 1400)
  }
  return null
}

// ---- per-kind fact builders -------------------------------------------
// Each returns { kind, refId, slug, title, url, meta, factText } or null
// when the row is not a real, publishable listing.

function priceUsdVilla(d) { return num1(d['price']) ?? num1(d['Цена']) }
function priceUsdApt(d)   { return num1(d['price_usd']) ?? num1(d['Цена']) }

function unitFacts(row, kind) {
  const d = row.data || {}
  if (d['Опубликовать'] !== true) return null
  const slug = fs1(d['SEO:Slug'])
  if (!slug || slug.startsWith('-')) return null
  const price = kind === 'villa' ? priceUsdVilla(d) : priceUsdApt(d)
  const name = fs1(d['ИИ Имя']) ?? fs1(d['Name']) ?? fs1(d['Namee'])
  // A real listing needs at least a price OR a meaningful name + area.
  const area = num1(d['Площадь'])
  if (!price && !area) return null

  const district = cleanDistrict(d)
  const bedrooms = num1(d['Комнаты']) ?? num1(d['Спальни'])
  const land = num1(d['Земля'])
  const project = notRecId(fs1(d['Комплекс 1']) ?? fs1(d['Комплекс']))
  const developer = notRecId(fs1(d['Developer1']) ?? fs1(d['Developer']) ?? fs1(d['Название застройщика с ошибками']))
  const status = fs1(d['Статус'])
  const completion = fs1(d['Year of completion ']) ?? fs1(d['Year of completion'])
  const view = fs1(d['Вид']) ?? fs1(d['View'])
  const leaseYears = num1(d['Leasehold']) ?? num1(d['Leashold'])
  const leaseUntil = fs1(d['Leasehold до'])
  const landPurpose = fs1(d['Назначение земли'])
  // Yield fields are unreliable — 'Доходность 10%' is an absolute $ income,
  // not a %, and stored % values are sometimes nonsense (170%). Only keep a
  // plausible yield (1–30%); otherwise omit rather than mislead.
  const yieldPct = plausibleYield(num1(d['Заявленная доходность']) ?? num1(d['ROi']))
  const commission = fs1(d['Платят (from Developer)']) ?? fs1(d['Платят']) ?? fs1(d['Комиссия'])
  // 'Цена м²' is garbage for apartments (off by 30×); always compute it.
  const pricePerSqm = price && area ? Math.round(price / area) : null
  const desc = descExcerpt(d['Aggregator:RU'], d[' Aggregator:RU '], d['SEO Text'], d['Notes'], d['ИИ описание'], d['Описание района'])

  const L = []
  L.push(`Тип: ${kind === 'villa' ? 'вилла (продажа)' : 'апартаменты (продажа)'}`)
  if (name) L.push(`Название: ${name}`)
  if (project) L.push(`Комплекс/проект: ${project}`)
  if (developer) L.push(`Застройщик: ${developer}`)
  if (district) L.push(`Район: ${district}`)
  if (bedrooms != null) L.push(`Спальни: ${bedrooms}`)
  if (area != null) L.push(`Площадь: ${area} м²`)
  if (land != null) L.push(`Участок: ${land} м²`)
  if (price) L.push(`Цена: $${price.toLocaleString('en-US')}`)
  if (pricePerSqm) L.push(`Цена за м²: $${pricePerSqm.toLocaleString('en-US')}`)
  if (status) L.push(`Статус: ${status}`)
  if (completion) L.push(`Сдача: ${completion}`)
  if (leaseYears) L.push(`Leasehold: ${leaseYears} лет${leaseUntil ? ` (до ${leaseUntil})` : ''}`)
  if (landPurpose) L.push(`Назначение земли: ${landPurpose}`)
  if (view) L.push(`Вид: ${view}`)
  if (yieldPct != null) L.push(`Заявленная доходность: ~${yieldPct}%`)
  if (commission) L.push(`Комиссия агенту: ${commission}`)
  if (desc) L.push(`Описание (сырое): ${desc}`)

  const url = `${SITE_URL}/ru/${kind === 'villa' ? 'villy' : 'apartamenty'}/o/${slug}`
  return {
    kind, refId: row.airtable_id, slug,
    title: (name || project || slug).replace(/\s*\|\s*Balinsky\s*$/, '').trim(),
    url,
    meta: { url, district, bedrooms, area_sqm: area, price_usd: price ?? null, price_per_sqm_usd: pricePerSqm ?? null, status, completion_year: completion, lease_years: leaseYears ?? null, developer, project, claimed_yield_pct: yieldPct ?? null },
    factText: L.join('\n'),
  }
}

export function villaFacts(row) { return unitFacts(row, 'villa') }
export function apartmentFacts(row) { return unitFacts(row, 'apartment') }

export function complexFacts(row) {
  const d = row.data || {}
  const slug = fs1(d['SEO:Slug'])
  if (!slug || slug.startsWith('-')) return null
  const project = fs1(d['Project'])
  if (!project) return null
  const district = cleanDistrict(d)
  const developer = notRecId(fs1(d['Developer1']) ?? fs1(d['Developer']))
  const status = fs1(d['Статус'])
  const completion = fs1(d['Year of completion ']) ?? fs1(d['Year of completion'])
  const total = num1(d['Total quantity of units'])
  const cls = fs1(d['Class'])
  const types = Array.isArray(d['Типы юнитов']) ? d['Типы юнитов'].map(x => fs1(x)).filter(Boolean).join(', ') : fs1(d['Типы юнитов'])
  const lease = num1(d['Leasehold']) ?? num1(d['Leashold'])
  const payment = fs1(d['Payment plan,%']) ?? fs1(d['Payment plan, %'])
  const roi = plausibleYield(num1(d['ROI']) ?? num1(d['Доходность']))
  // NB: deliberately NOT pulling 'Описание района (from Location 2)' — that is
  // the district blurb, which would make the complex summary describe Ubud/
  // Canggu instead of the complex itself.
  const desc = descExcerpt(d['ИИ Описание'], d['ИИ Описание 2'], d['Саммари саммари'], d['Описание'], d['Описание ENG'], d['SEO Text'])

  const L = []
  L.push('Тип: жилой комплекс (новостройка)')
  L.push(`Название: ${project}`)
  if (developer) L.push(`Застройщик: ${developer}`)
  if (district) L.push(`Район: ${district}`)
  if (cls) L.push(`Класс: ${cls}`)
  if (status) L.push(`Статус продаж/строительства: ${status}`)
  if (completion) L.push(`Сдача: ${completion}`)
  if (total) L.push(`Всего юнитов: ${total}`)
  if (types) L.push(`Типы юнитов: ${types}`)
  if (lease) L.push(`Leasehold: ${lease} лет`)
  if (payment) L.push(`План оплаты: ${payment}`)
  if (roi != null) L.push(`Доходность (заявл.): ~${roi}%`)
  if (desc) L.push(`Описание (сырое): ${desc}`)

  const url = `${SITE_URL}/ru/zhilye-kompleksy/o/${slug}`
  return {
    kind: 'complex', refId: row.airtable_id, slug,
    title: project.replace(/\s*\|\s*Balinsky\s*$/, '').trim(),
    url,
    meta: { url, district, developer, status, completion_year: completion, total_units: total ?? null, class: cls, lease_years: lease ?? null, claimed_yield_pct: roi ?? null },
    factText: L.join('\n'),
  }
}

export function developerFacts(row) {
  const d = row.data || {}
  const name = fs1(d['Developer'])
  if (!name) return null
  const slug = fs1(d['SEO:Slug']) ?? fs1(d['Developer_key'])
  const rating = num1(d['Общий рейтинг']) ?? num1(d['Рейтинг Митюхина'])
  const commission = fs1(d['Комиссия отображение']) ?? fs1(d['Комиссия'])
  const yieldD = num1(d['Доходность'])
  const reputation = descExcerpt(d['Репутация и опыт'], d['Репутация и опыт EN'])
  const construction = descExcerpt(d['Строительство и недвижимость'])
  const mgmt = descExcerpt(d['Управляющая компания'])
  const team = descExcerpt(d['Команда'])
  const desc = descExcerpt(d['Описание ИИ'], d['AI Описание'], d['SEO Text'])
  const site = fs1(d["Link on developer's website"])

  const L = []
  L.push('Тип: застройщик')
  L.push(`Название: ${name}`)
  if (rating != null) L.push(`Рейтинг: ${rating}`)
  if (commission) L.push(`Комиссия агенту: ${commission}`)
  if (yieldD != null) L.push(`Типичная доходность объектов: ~${yieldD}%`)
  if (reputation) L.push(`Репутация и опыт: ${reputation}`)
  if (construction) L.push(`Строительство и недвижимость: ${construction}`)
  if (mgmt) L.push(`Управляющая компания: ${mgmt}`)
  if (team) L.push(`Команда: ${team}`)
  if (desc) L.push(`Описание (сырое): ${desc}`)
  if (site) L.push(`Сайт: ${site}`)

  const url = slug ? `${SITE_URL}/ru/zastrojshhiki/${slug}` : null
  return {
    kind: 'developer', refId: row.airtable_id, slug: slug ?? null,
    title: name,
    url,
    meta: { url, rating: rating ?? null, commission, claimed_yield_pct: yieldD ?? null, website: site },
    factText: L.join('\n'),
  }
}

// Rentals come from the already-clean rental/_rental.json manifest, so they
// are embedded DIRECTLY from facts (no LLM rewrite — the notes are already
// natural renter-language and an LLM pass would be ~1.4k low-ROI calls).
export function rentalEmbedRecord(r) {
  if (!r || !r.slug) return null
  const L = []
  L.push(`Тип: аренда (помесячно) — ${fs1(r.type) ?? 'жильё'}`)
  if (r.title) L.push(`Название: ${r.title}`)
  if (r.location) L.push(`Район: ${r.location}`)
  if (r.bedrooms != null) L.push(`Спальни: ${r.bedrooms}`)
  if (r.priceMonthUsd) L.push(`Цена/мес: $${Number(r.priceMonthUsd).toLocaleString('en-US')}`)
  else if (r.priceSegment) L.push(`Цена: ${r.priceSegment}`)
  if (r.notes) L.push(`Описание: ${String(r.notes).replace(/\s+/g, ' ').trim().slice(0, 1200)}`)
  const summary = L.join('\n')
  const url = `${SITE_URL}/ru/arenda/o/${r.slug}`
  return {
    kind: 'rental', refId: r.id ?? r.slug, slug: r.slug,
    title: r.title ?? r.slug,
    summary,
    embedding_text: summary,
    meta: { url, district: r.location ?? null, bedrooms: r.bedrooms ?? null, rent_per_month_usd: r.priceMonthUsd ?? null, type: fs1(r.type), telegram: r.telegram ?? null },
    source_hash: sha1(summary),
  }
}

// ---- LLM summary prompts ----------------------------------------------

export const SUMMARY_SYSTEM = `Ты — Балиса, эксперт-консультант по недвижимости Бали для русскоязычных инвесторов и покупателей.
Тебе дают СЫРЫЕ факты по одному объекту. Сделай из них короткое, плотное инвесторское саммари (4–7 предложений, без воды, без маркетинговых клише).

Требования:
- Пиши по-русски, конкретно, цифрами. Опирайся ТОЛЬКО на данные из фактов — НИЧЕГО не выдумывай (ни доходность, ни сроки, ни удобства, которых нет).
- Передай: что это и где, ключевые параметры (цена, площадь, спальни, лизхолд/статус), для кого подходит (посуточная аренда / долгосрок / семья / ETF-стиль buy&hold), сильные стороны и реальные риски/на что смотреть.
- Если данных по доходности нет — не называй цифру, скажи нейтрально.
- ВАЖНО: если цифры в блоке «Описание (сырое)» противоречат структурным фактам выше (цена, площадь, спальни, лизхолд) — доверяй СТРУКТУРНЫМ фактам. Сырое описание используй только для качественных деталей (атмосфера, удобства, окружение, дизайн).
- Пиши так, как будто это твоя внутренняя заметка, по которой ты потом ответишь клиенту. Без приветствий, без ссылок, без эмодзи.
- Включай естественные ключевые слова, по которым клиент может искать (район, инфинити-бассейн, джунгли, океан, для digital-nomad, под сдачу и т.п.), если они следуют из фактов.`

export function summaryUser(factText, title) {
  return `Объект: ${title}\n\nФакты:\n${factText}\n\nНапиши инвесторское саммари.`
}
