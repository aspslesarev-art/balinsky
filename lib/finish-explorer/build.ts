// Эксплорер «Отделка и спрос на Бали» (/admin/otdelka).
//
// Раз в неделю собирает срез из сырых таблиц estatemarket (booking_data_*)
// и vision-разбора фото (booking_data_vision) и кладёт его в Storage.
// Страница читает готовый файл, база при открытии не трогается.
//
// Почему не вьюха booking_market_relative: на полном проходе она ловит
// statement timeout и берёт цену как есть. А цена карты estatemarket бывает
// заглушкой — вилла на 5 спален «за $1», хотя в карточке $1 060. Поэтому
// цена чистится здесь, и страты «зона × тип × спальни» считаются по чистой.
//
// Новых разборов фото сборка НЕ заказывает (это платно) — объекты без
// разбора в срез просто не попадают.

import type { SupabaseClient } from '@supabase/supabase-js'

export const BUCKET = 'admin-reports'
export const OBJECT = 'finish-explorer/data.json'

const VIEWS = ['ocean_full', 'ocean_partial', 'rice_field', 'jungle', 'river_valley', 'mountain', 'garden', 'pool', 'urban', 'none']
const FLAGS = ['worn_furniture', 'stains_or_mold', 'cramped_rooms', 'clutter', 'poor_lighting', 'dated_bathroom', 'no_outdoor_space', 'construction_nearby', 'road_or_noise', 'low_quality_photos']
const POOLS = ['infinity', 'private_standard', 'plunge', 'lap', 'shared', 'none']
const COND = ['new', 'well_kept', 'aging', 'worn']
const STYLE = ['modern_tropical', 'balinese_traditional', 'minimalist', 'luxury_contemporary', 'boho_mediterranean', 'scandinavian', 'industrial_loft', 'colonial', 'rustic_wood', 'generic_budget', 'none']
const KINDS = ['villa', 'apartment', 'hotel', 'guesthouse', 'hostel', 'house', 'resort', 'aparthotel', 'other']
const IMGP = ['hotel/max500', 'hotel/max300', 'hotel/square240', 'xphoto/max500_ao']

// Те же центры, что у booking_zone() в migrations/062 — держать в синхроне.
const ZONES: [string, number, number][] = [
  ['Чангу — Бату-Болонг', -8.6553, 115.1300], ['Берава', -8.6650, 115.1420],
  ['Переренан', -8.6440, 115.1210], ['Сесех — Чемаги', -8.6420, 115.1050],
  ['Падонан — Тумбак-Баю', -8.6330, 115.1450], ['Умалас', -8.6650, 115.1580],
  ['Керобокан', -8.6740, 115.1690], ['Семиньяк', -8.6900, 115.1620],
  ['Легиан — Кута', -8.7150, 115.1720], ['Тубан — аэропорт', -8.7450, 115.1700],
  ['Джимбаран', -8.7900, 115.1650], ['Баланган', -8.7930, 115.1250],
  ['Улувату — Пекату', -8.8250, 115.0900], ['Бингин — Паданг-Паданг', -8.8100, 115.1150],
  ['Унгасан — Меласти', -8.8420, 115.1520], ['Нуса-Дуа', -8.8000, 115.2280],
  ['Сануp', -8.6900, 115.2620], ['Денпасар', -8.6700, 115.2150],
  ['Кедунгу — Табанан', -8.6100, 115.0800], ['Убуд', -8.5070, 115.2620],
  ['Тегаллаланг — Паянган', -8.4300, 115.2800], ['Сидемен', -8.4700, 115.4300],
  ['Чандидаса — Карангасем', -8.5100, 115.5700], ['Амед', -8.3350, 115.6600],
  ['Ловина — север', -8.1600, 115.0250], ['Мундук — Бедугул', -8.2700, 115.1000],
  ['Нуса-Пенида — Лембонган', -8.7200, 115.4500], ['Гианьяр — Керамас', -8.5900, 115.3300],
  ['Кинтамани — Батур', -8.2600, 115.3700], ['Джембрана — запад', -8.3600, 114.6300],
]
const OTHER_ZONE = 'Прочее'

const rad = (d: number) => d * Math.PI / 180
function zoneOf(lat: number, lng: number): string {
  let best: string | null = null, bestD = Infinity
  for (const [name, zl, zg] of ZONES) {
    const c = Math.cos(rad(lat)) * Math.cos(rad(zl)) * Math.cos(rad(zg) - rad(lng)) + Math.sin(rad(lat)) * Math.sin(rad(zl))
    if (6371000 * Math.acos(Math.min(1, c)) > 8000) continue
    const d = (lat - zl) ** 2 + (lng - zg) ** 2 * 0.98
    if (d < bestD) { bestD = d; best = name }
  }
  return best ?? OTHER_ZONE
}

// В выгрузке estatemarket есть Таиланд — режем рамкой Бали.
const inBali = (lat: number, lng: number) => lat >= -8.95 && lat <= -8.05 && lng >= 114.40 && lng <= 115.75

// ─── Цена за ночь ────────────────────────────────────────────────────────────
// Карта отдаёт цену показа, карточка — нижнюю границу по номерам. Правила:
//  1. цена карты меньше четверти минимальной цены карточки — это заглушка
//     ($1, $9 у виллы за $1 060), берём цену карточки;
//  2. итоговая цена меньше 20% медианы своей страты (страта ≥ 8 объектов) —
//     надёжной цены нет, показываем «—» и в индексы к соседям не пускаем.
//     Дешёвые хостелы и гестхаусы по $8 правило не задевает: у них и страта дешёвая.
const PLACEHOLDER_SHARE = 0.25
const STRATUM_FLOOR = 0.2
const MIN_STRATUM = 8

export function pickAdr(mapPrice: number | null, cardMin: number | null): number | null {
  const m = mapPrice != null && mapPrice > 0 ? mapPrice : null
  const c = cardMin != null && cardMin > 0 ? cardMin : null
  if (m != null && c != null && m < c * PLACEHOLDER_SHARE) return c
  return m ?? c
}

const bedsBucket = (b: number | null) => b == null ? 'n/a' : b <= 1 ? '0-1' : b === 2 ? '2' : b === 3 ? '3' : '4+'
const medianOf = (a: number[]) => {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y), h = s.length >> 1
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

type Vision = Record<string, any>
type Card = { id: number; title: string | null; slug: string | null; unit_kind: string | null; bedrooms: number | null; star: number | null; images: unknown; min_price: number | null; area_sqm: number | null }
type Loc = { id: number; price: number | null; occupancy: number | null; lat: number | null; lng: number | null }

async function pageAll<T>(sb: SupabaseClient, table: string, select: string, pageSize = 1000): Promise<T[]> {
  const out: T[] = []
  let after = 0
  for (;;) {
    const { data, error } = await sb.from(table).select(select).gt('id', after).order('id').limit(pageSize)
    if (error) throw new Error(`${table}: ${error.message}`)
    const rows = (data ?? []) as unknown as (T & { id: number })[]
    out.push(...rows)
    if (rows.length < pageSize) return out
    after = rows[rows.length - 1].id
  }
}

async function byIds<T>(sb: SupabaseClient, table: string, select: string, ids: number[]): Promise<Map<number, T>> {
  const out = new Map<number, T>()
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await sb.from(table).select(select).in('id', ids.slice(i, i + 300))
    if (error) throw new Error(`${table}: ${error.message}`)
    for (const r of (data ?? []) as unknown as (T & { id: number })[]) out.set(r.id, r)
  }
  return out
}

const mask = (arr: string[] | undefined, dict: string[]) =>
  (arr ?? []).reduce((m, v) => { const i = dict.indexOf(v); return i >= 0 ? m | (1 << i) : m }, 0)
const r1 = (x: number | null) => x == null ? null : Math.round(x * 10) / 10
const r2 = (x: number | null) => x == null ? null : Math.round(x * 100) / 100
const kebab = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const packPhoto = (u: string) => {
  const m = /^https:\/\/cf\.bstatic\.com\/xdata\/images\/(hotel\/max500|hotel\/max300|hotel\/square240|xphoto\/max500_ao)\/(\d+)\.jpg\?k=([0-9a-f]+)&o=$/.exec(u)
  return m ? IMGP.indexOf(m[1]) + '|' + m[2] + '|' + m[3] : '@' + u
}

export type BuildStats = { rows: number; priceFromCard: number; priceDropped: number; outsideBali: number; noOccupancy: number }

export async function buildFinishExplorer(sb: SupabaseClient) {
  const vision = await pageAll<{ id: number; vision: Vision }>(sb, 'booking_data_vision', 'id,vision', 500)
  const withTier = vision.filter(v => v.vision?.finish_tier)
  const ids = withTier.map(v => v.id)
  const [cards, locs] = await Promise.all([
    byIds<Card>(sb, 'booking_data_cards', 'id,title,slug,unit_kind,bedrooms,star,images,min_price,area_sqm', ids),
    byIds<Loc>(sb, 'booking_data_locations', 'id,price,occupancy,lat,lng', ids),
  ])

  const stats: BuildStats = { rows: 0, priceFromCard: 0, priceDropped: 0, outsideBali: 0, noOccupancy: 0 }
  type Base = { v: Vision; c: Card; zone: string; stratum: string; adr: number | null; occ: number }
  const base: Base[] = []
  for (const { id, vision: v } of withTier) {
    const c = cards.get(id), l = locs.get(id)
    if (!c || !l || l.lat == null || l.lng == null) continue
    if (!inBali(l.lat, l.lng)) { stats.outsideBali++; continue }
    if (l.occupancy == null) { stats.noOccupancy++; continue }
    const adr = pickAdr(l.price, c.min_price)
    if (adr == null) continue
    if (l.price != null && l.price > 0 && adr !== l.price) stats.priceFromCard++
    const zone = zoneOf(l.lat, l.lng)
    base.push({ v, c, zone, stratum: `${zone}|${c.unit_kind ?? ''}|${bedsBucket(c.bedrooms)}`, adr, occ: l.occupancy })
  }

  // Две ступени: медианы по всем ценам, отсев невозможных, медианы заново.
  const strataOf = (rows: Base[]) => {
    const g = new Map<string, Base[]>()
    for (const b of rows) { const a = g.get(b.stratum); a ? a.push(b) : g.set(b.stratum, [b]) }
    const s = new Map<string, { n: number; adr: number | null; occ: number | null; revpar: number | null }>()
    for (const [k, a] of g) {
      const priced = a.filter(b => b.adr != null)
      s.set(k, {
        n: a.length,
        adr: medianOf(priced.map(b => b.adr!)),
        occ: medianOf(a.map(b => b.occ)),
        revpar: medianOf(priced.map(b => b.adr! * b.occ / 100)),
      })
    }
    return s
  }
  const rough = strataOf(base)
  for (const b of base) {
    const s = rough.get(b.stratum)!
    if (s.n >= MIN_STRATUM && s.adr != null && b.adr! < s.adr * STRATUM_FLOOR) { b.adr = null; stats.priceDropped++ }
  }
  const strata = strataOf(base)

  const zones = [...new Set(base.map(b => b.zone))].sort()
  const rows: unknown[][] = [], extra: string[][] = []
  for (const { v, c, zone, stratum, adr, occ } of base) {
    const s = strata.get(stratum)!
    const revpar = adr == null ? null : adr * occ / 100
    const slug = c.slug ?? ''
    const imgs = (typeof c.images === 'string' ? JSON.parse(c.images) : (c.images ?? [])) as unknown[]
    const packed = imgs.filter((u): u is string => typeof u === 'string' && u.startsWith('http')).slice(0, 6).map(packPhoto)
    rows.push([
      slug, c.title && kebab(c.title) !== slug ? c.title : '',
      Math.max(0, KINDS.indexOf(c.unit_kind ?? '')), c.bedrooms ?? null, zones.indexOf(zone),
      adr == null ? null : Math.round(adr), r1(occ), revpar == null ? null : Math.round(revpar),
      adr == null || !s.adr ? null : r2(adr / s.adr),
      !s.occ ? null : r2(occ / s.occ),
      revpar == null || !s.revpar ? null : r2(revpar / s.revpar),
      s.n,
      v.finish_tier, v.design_coherence ?? null,
      mask(v.views, VIEWS), Math.max(0, POOLS.indexOf(v.pool_type)),
      v.instagrammability ?? null, v.photo_professional ?? null,
      Math.max(0, COND.indexOf(v.condition)), Math.max(0, STYLE.indexOf(v.style_primary)),
      v.kitchen_tier ?? null, v.bathroom_tier ?? null, v.confidence ?? null,
      mask(v.red_flags, FLAGS),
      v.wow_element && v.wow_element !== 'none' ? v.wow_element : '',
      c.star ?? null, c.area_sqm ?? null,
      v.pool_deck_tier ?? null, v.natural_light ?? null, v.outdoor_living_share ?? null,
      packed[0] ?? '',
    ])
    extra.push(packed.slice(1))
  }
  stats.rows = rows.length

  const meta = {
    views: VIEWS, flags: FLAGS, pools: POOLS, cond: COND, style: STYLE, kinds: KINDS, imgp: IMGP, zones,
    generatedAt: new Date().toISOString(), n: rows.length, stats,
  }
  return { payload: { meta, rows, photos: extra }, stats }
}

export async function publishFinishExplorer(sb: SupabaseClient) {
  const { payload, stats } = await buildFinishExplorer(sb)
  const { data: buckets } = await sb.storage.listBuckets()
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: false })
    if (error && !/already exists/i.test(error.message)) throw new Error(`bucket: ${error.message}`)
  }
  const body = JSON.stringify(payload)
  const { error } = await sb.storage.from(BUCKET).upload(OBJECT, body, {
    contentType: 'application/json', upsert: true, cacheControl: '300',
  })
  if (error) throw new Error(`upload: ${error.message}`)
  return { ...stats, bytes: body.length, generatedAt: payload.meta.generatedAt }
}
