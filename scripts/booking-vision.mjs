#!/usr/bin/env node
// Vision-проход по фото листингов краткосрочной аренды Бали (booking_data_*).
//
// Зачем: у нас есть цена/ночь и загрузка по 14k объектов, но нет ни одного
// признака САМОГО ПРОДУКТА. Фото — единственный источник, где виден стиль,
// уровень отделки, вид, бассейн, планировка. Разобрав их в контролируемый
// словарь, можно считать «за что рынок реально платит» и прикладывать это
// к проектам застройщиков (что строят vs что приносит деньги).
//
// Вход:  view booking_data_vision_todo (Бали, ≥3 фото, ещё не разобрано)
// Выход: table booking_data_vision (id, vision jsonb, model, photos_used)
//
// Usage:
//   node scripts/booking-vision.mjs --dry-run --limit=5
//   node scripts/booking-vision.mjs --limit=200 --conc=16
//   node scripts/booking-vision.mjs --only-modelable        # сначала те, где есть цена+загрузка
//   node scripts/booking-vision.mjs                          # всё, что осталось

import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv } from './_kb-build.mjs'

loadEnv()

const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null }

const DRY = has('--dry-run')
const ONLY_MODELABLE = has('--only-modelable')
const LIMIT = val('limit') ? parseInt(val('limit'), 10) : Infinity
const CONC = val('conc') ? parseInt(val('conc'), 10) : 12
const MAXPHOTOS = val('maxphotos') ? parseInt(val('maxphotos'), 10) : 6
const BATCH = 300

// Реальные ставки Azure на gpt-5.4 (Cost Management, июль 2026).
const PRICE_IN = 2.50 / 1e6
const PRICE_OUT = 15.00 / 1e6

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
})
const MODEL = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'

// ─── Контролируемый словарь ────────────────────────────────────────────────
// Ключи и значения СТАБИЛЬНЫ: на них считается аналитика и строятся сравнения
// с объектами застройщиков. Добавлять можно, переименовывать — нет.
const E = {
  visual_kind: ['villa_private', 'villa_in_complex', 'apartment', 'hotel_room', 'guesthouse_room', 'hostel_dorm', 'house', 'unclear'],
  style: ['modern_tropical', 'balinese_traditional', 'minimalist', 'luxury_contemporary', 'boho_mediterranean', 'scandinavian', 'industrial_loft', 'colonial', 'rustic_wood', 'generic_budget', 'none'],
  condition: ['new', 'well_kept', 'aging', 'worn'],
  materials: ['thatch_alang', 'teak_wood', 'bamboo', 'rattan', 'exposed_concrete', 'microcement', 'terrazzo', 'natural_stone', 'marble', 'white_plaster', 'glass_walls', 'ceramic_tile', 'painted_drywall'],
  architecture: ['open_air_living', 'double_height_ceiling', 'floor_to_ceiling_glass', 'rooftop_terrace', 'balcony', 'private_garden', 'sala_gazebo', 'courtyard', 'multi_level'],
  pool: ['infinity', 'private_standard', 'plunge', 'lap', 'shared', 'none'],
  views: ['ocean_full', 'ocean_partial', 'rice_field', 'jungle', 'river_valley', 'mountain', 'garden', 'pool', 'urban', 'none'],
  rooms: ['bedroom', 'bathroom', 'kitchen', 'living', 'dining', 'workspace', 'pool_area', 'exterior', 'garden', 'lobby', 'restaurant', 'gym', 'spa', 'coworking', 'rooftop'],
  space: ['cramped', 'compact', 'comfortable', 'spacious', 'grand'],
  segment: ['couples', 'families', 'digital_nomads', 'surfers', 'groups', 'wellness', 'budget_backpackers', 'luxury_travellers'],
  flags: ['worn_furniture', 'stains_or_mold', 'cramped_rooms', 'clutter', 'poor_lighting', 'dated_bathroom', 'no_outdoor_space', 'construction_nearby', 'road_or_noise', 'low_quality_photos'],
}

const int = (min, max, d) => ({ type: 'integer', minimum: min, maximum: max, description: d })
const arr = (items, d) => ({ type: 'array', items: { type: 'string', enum: items }, description: d })

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    visual_kind: { type: 'string', enum: E.visual_kind, description: 'what the photos actually show' },
    style_primary: { type: 'string', enum: E.style },
    style_secondary: { type: 'string', enum: E.style },
    finish_tier: int(1, 5, '1 = cheap/worn finishes, 3 = decent mid-market, 5 = ultra-luxury'),
    design_coherence: int(1, 5, 'how deliberate and consistent the design is across rooms'),
    condition: { type: 'string', enum: E.condition },
    materials: arr(E.materials, 'materials clearly visible'),
    architecture: arr(E.architecture),
    pool_type: { type: 'string', enum: E.pool },
    pool_deck_tier: int(0, 5, '0 = no pool visible'),
    views: arr(E.views, 'views visible FROM the property'),
    outdoor_living_share: int(1, 5, 'how much of living space is outdoor/semi-outdoor'),
    rooms_shown: arr(E.rooms),
    kitchen_tier: int(0, 5, '0 = no kitchen shown'),
    bathroom_tier: int(0, 5, '0 = no bathroom shown'),
    bathtub: { type: 'boolean' },
    outdoor_shower: { type: 'boolean' },
    ac_visible: { type: 'boolean' },
    workspace_desk: { type: 'boolean' },
    natural_light: int(1, 5),
    space_feel: { type: 'string', enum: E.space },
    guest_segment: arr(E.segment, 'who this product is visibly built for'),
    photo_professional: int(1, 5, 'photography quality: 1 = phone snapshots, 5 = pro shoot'),
    photo_staged: { type: 'boolean' },
    photo_twilight: { type: 'boolean' },
    photo_drone: { type: 'boolean' },
    photo_people: { type: 'boolean' },
    instagrammability: int(1, 5, 'how likely a guest posts this place on social media'),
    wow_element: { type: 'string', description: 'single standout feature, max 8 words English, or "none"' },
    red_flags: arr(E.flags),
    confidence: int(1, 5, 'how confident you are overall given the photos'),
  },
  required: ['visual_kind', 'style_primary', 'style_secondary', 'finish_tier', 'design_coherence', 'condition', 'materials', 'architecture', 'pool_type', 'pool_deck_tier', 'views', 'outdoor_living_share', 'rooms_shown', 'kitchen_tier', 'bathroom_tier', 'bathtub', 'outdoor_shower', 'ac_visible', 'workspace_desk', 'natural_light', 'space_feel', 'guest_segment', 'photo_professional', 'photo_staged', 'photo_twilight', 'photo_drone', 'photo_people', 'instagrammability', 'wow_element', 'red_flags', 'confidence'],
}

const SYS = `You are a hospitality real-estate product analyst. You get several photos of ONE short-term rental listing in Bali.
Judge the PRODUCT, not the marketing: what is physically there, how well it is built and finished, and who would book it.
Rules:
- Use ONLY what is visible. If something is not shown, use the "no ... shown" option (0 / "none" / empty array). Never infer from the vibe.
- Tiers are absolute Bali-market scales, not relative to this listing: finish_tier 1 = bare tile-and-drywall budget room, 3 = clean modern mid-market, 5 = designer villa with custom joinery and stone.
- style_secondary = "none" when a single style dominates.
- views = what you see FROM the property (from its terrace/pool/window), not the surroundings from a drone above the roof.
- red_flags only for things clearly visible in the photos.
Return JSON only.`

// ─── Прогон ────────────────────────────────────────────────────────────────
let done = 0, failed = 0, tokIn = 0, tokOut = 0
const failedIds = new Set()
const attempts = new Map()
const started = Date.now()

const cost = () => tokIn * PRICE_IN + tokOut * PRICE_OUT

// Берём фото «веером» по всему массиву: первый кадр — всегда обложка,
// остальные равномерно, чтобы попали спальня/ванная/кухня, а не 6 ракурсов фасада.
function pickPhotos(images) {
  const list = (images ?? []).filter(u => typeof u === 'string' && u.startsWith('http'))
  if (list.length <= MAXPHOTOS) return list
  const out = [list[0]]
  const step = (list.length - 1) / (MAXPHOTOS - 1)
  for (let i = 1; i < MAXPHOTOS; i++) out.push(list[Math.round(i * step)])
  return [...new Set(out)]
}

async function analyze(urls) {
  const content = [{ type: 'text', text: `Analyze these ${urls.length} photos of one Bali rental listing.` }]
  for (const u of urls) content.push({ type: 'image_url', image_url: { url: u } })
  const r = await ai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: SYS }, { role: 'user', content }],
    temperature: 0.1,
    max_completion_tokens: 900,
    response_format: { type: 'json_schema', json_schema: { name: 'listing_vision', strict: true, schema: SCHEMA } },
  })
  tokIn += r.usage?.prompt_tokens ?? 0
  tokOut += r.usage?.completion_tokens ?? 0
  return JSON.parse(r.choices[0].message.content)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Часть картинок на CDN битые (404) — из-за одной падает весь вызов.
// Выбрасываем именно её и пробуем снова, пока остаётся ≥3 кадра.
function dropBrokenUrl(urls, message) {
  const m = /Failed to download image from (\S+)/.exec(message ?? '')
  if (!m) return null
  const bad = m[1].replace(/[.,]$/, '')
  const rest = urls.filter(u => !u.startsWith(bad.slice(0, 80)))
  return rest.length >= 3 && rest.length < urls.length ? rest : null
}

// Общий «стоп-кран»: на 429 весь пул воркеров ждёт, а не долбит квоту дальше.
let pauseUntil = 0
async function waitIfPaused() {
  while (Date.now() < pauseUntil) await sleep(Math.min(2000, pauseUntil - Date.now()))
}

async function analyzeWithRetry(urls) {
  let list = urls
  let lastErr
  for (let attempt = 0; attempt < 7; attempt++) {
    await waitIfPaused()
    try { return await analyze(list) } catch (e) {
      lastErr = e
      const status = e?.status ?? e?.response?.status
      if (status === 400) {
        const pruned = dropBrokenUrl(list, e.message)
        if (!pruned) throw e
        list = pruned
        continue
      }
      if (status === 429) {
        const retryAfter = Number(e?.headers?.['retry-after'] ?? e?.response?.headers?.get?.('retry-after')) || 0
        const wait = Math.max(retryAfter * 1000, Math.min(45000, 4000 * 2 ** attempt)) + Math.random() * 1500
        pauseUntil = Math.max(pauseUntil, Date.now() + wait)
        continue
      }
      if (status && status < 500) throw e
      await sleep(2000 * (attempt + 1) + Math.random() * 1000)
    }
  }
  lastErr.rateLimited = (lastErr?.status ?? lastErr?.response?.status) === 429
  throw lastErr
}

async function flush(rows) {
  if (!rows.length || DRY) return
  const { error } = await sb.from('booking_data_vision').upsert(rows, { onConflict: 'id' })
  if (error) console.error('\n  upsert err:', error.message)
  rows.length = 0
}

// Отвалившиеся id исключаем НА СЕРВЕРЕ: иначе они, стоя в начале сортировки,
// занимают всю страницу и очередь выглядит пустой при тысячах неразобранных.
async function fetchBatch() {
  let q = sb.from('booking_data_vision_todo').select('id,images,unit_kind,bedrooms,modelable')
  if (ONLY_MODELABLE) q = q.eq('modelable', true)
  if (failedIds.size) q = q.not('id', 'in', `(${[...failedIds].join(',')})`)
  const { data, error } = await q.order('modelable', { ascending: false }).limit(BATCH)
  if (error) { console.error('fetch err:', error.message); return [] }
  return data ?? []
}

async function main() {
  console.log(`booking-vision — Azure ${MODEL}${DRY ? ' [DRY]' : ''} conc=${CONC} maxphotos=${MAXPHOTOS}${ONLY_MODELABLE ? ' [modelable only]' : ''}`)
  const buffer = []

  while (done + failed < LIMIT) {
    const batch = await fetchBatch()
    if (!batch.length) break
    const work = batch.slice(0, Math.max(0, LIMIT - done - failed))
    if (!work.length) break

    let idx = 0
    const worker = async () => {
      while (idx < work.length) {
        const row = work[idx++]
        const urls = pickPhotos(row.images)
        if (urls.length < 3) { failedIds.add(row.id); failed++; continue }
        try {
          const vision = await analyzeWithRetry(urls)
          if (DRY) {
            console.log(`\n[${row.id}] ${row.unit_kind}/${row.bedrooms ?? '-'}br`, JSON.stringify(vision))
          } else {
            buffer.push({ id: row.id, vision, model: MODEL, photos_used: urls.length })
          }
          done++
          if (buffer.length >= 50) await flush(buffer)
          const rate = done / ((Date.now() - started) / 1000)
          process.stdout.write(`\r  ${done} done, ${failed} failed — $${cost().toFixed(2)} — ${rate.toFixed(1)}/s   `)
        } catch (e) {
          // 429 — вина квоты, а не объекта: даём ему ещё два круга,
          // прежде чем вычеркнуть насовсем.
          const tries = (attempts.get(row.id) ?? 0) + 1
          attempts.set(row.id, tries)
          if (!e.rateLimited || tries >= 3) { failedIds.add(row.id); failed++ }
          console.error(`\n  err ${row.id}: ${String(e.message).slice(0, 140)}`)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONC, work.length) }, worker))
    await flush(buffer)
    if (DRY) break
  }
  await flush(buffer)

  const secs = Math.round((Date.now() - started) / 1000)
  console.log(`\nDone: ${done} analyzed, ${failed} failed, ${secs}s — tokens ${tokIn} in / ${tokOut} out — $${cost().toFixed(2)} ($${done ? (cost() / done).toFixed(4) : '0'} / listing)`)
}

await main()
