import { createClient } from '@supabase/supabase-js'
import { loadNearby } from '../competitors'
import { monthlyRentNear, type MonthlyBundle } from './monthly'
import { loadNearbyPlaces, type NearbyPlace } from '../nearby-places'
import { regionFor, type RegionDefaults } from './regions'
import { classifyZone, type BeachZone, zoneTitle } from './zones'
import { matchCompetitors, type MatchMode } from './matching'
import { adrPercentiles, buildScenarios, type ScenarioBundle } from './economics'
import { scoreInfra, type InfraScore } from './infra-score'
import { isDailyRentalRestricted } from '@/lib/land-use'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Row = { airtable_id: string; data: Record<string, unknown> }

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}
function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/\s/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length > 0) return numberOrNull(v[0])
  if (v && typeof v === 'object' && 'value' in v) return numberOrNull((v as { value: unknown }).value)
  return null
}

export type Confidence = 'high' | 'medium' | 'low'

/** Ступени поиска похожих объектов и минимум для расчёта (как mode 'reduced' в matching.ts). */
const SEARCH_RADII_KM = [2, 3, 5, 8] as const
const MIN_MATCHES_FOR_CALC = 5

export type InvestmentSnapshot = {
  villaId: string
  generatedAt: string
  villa: {
    title: string
    lat: number
    lng: number
    bedrooms: number | null
    area: number | null
    askingPrice: number | null
    leaseholdYearsLeft: number | null
    hasPool: boolean | null
    district: string | null
    photo: string | null
  }
  region: RegionDefaults
  zone: { applied: BeachZone; raw: BeachZone; title: string; expanded: boolean; nearestBeach: NearbyPlace | null; walkingMeters: number | null }
  mode: MatchMode
  confidence: Confidence
  matchSampleSize: number
  scenarios: ScenarioBundle | null
  /** Where the calculator's nightly rate comes from: similar listings, too few of them, or every listing around. */
  adrBasis: 'matches' | 'few' | 'area'
  references: NearbyMatchCard[] | null
  /** Помесячная аренда: на жилой земле — вместо посуточной, у вилл — для сравнения. */
  monthly: MonthlyBundle | null
  competitors: NearbyMatchCard[]
  mapCompetitors: MapCompetitor[]
  totalCompetitorsInRadius: number
  /** Радиус, в котором нашлись похожие объекты (2 км, если хватило; иначе шире). */
  searchRadiusKm: number
  infra: InfraScore
  anchors: NearbyPlace[]
  nearbyByCategory: Record<string, NearbyPlace[]>
  flags: { emergingMarket: boolean; weakPerformance: boolean; leaseholdRisk: boolean; isLuxury: boolean; expandedZone: boolean; rentalRestricted: boolean }
  /** Комплекс сам сдаётся на Booking (complex_booking_match): его загрузка и цена за ночь. */
  ownBooking: OwnBooking | null
  /** Загрузка похожих объявлений вокруг — вместо средних 60%, если она есть. */
  marketOccupancy: MarketOccupancy | null
}

export type MarketOccupancy = {
  /** 0..1, медиана средней загрузки похожих объявлений вокруг. */
  occupancy: number
  listings: number
  radiusM: number
}

export type OwnBooking = {
  /** 'actual' — реальные брони управляющей (complex_rental_actuals), только
   *  они дают отметку «Подтверждённая доходность»; 'booking' — витрина Booking. */
  source: 'actual' | 'booking'
  /** Период реальных броней (для source 'actual'). */
  period: { from: string; to: string; months: number } | null
  /** Доля занятых ночей, 0..1, медиана по объявлениям комплекса. */
  occupancy: number | null
  /** Цена за ночь, USD: медиана по номерам с тем же числом спален, иначе по всем. */
  adr: number | null
  /** 'revenue' — цена ночи пересчитана из реальной выручки управляющей. */
  adrSource: 'booking' | 'revenue' | null
  listings: { id: number; title: string | null; occupancy: number | null }[]
}

// 100% у estatemarket — это календарь, закрытый целиком (часто блок хозяина),
// а не год без единой свободной ночи. Потолок 90%: у 11 вилл BREIG с отчётом
// управляющей за 12 месяцев (авг 2025 – июль 2026) лучшая годовая загрузка 91%,
// средняя 81%.
const OWN_OCC_CAP = 0.90
// Объявление, у которого загрузка не меняется весь срок наблюдений (одно-два
// значения на ~70 снимков) и стоит под 100%, — закрытый календарь, а не брони.
const FROZEN_MAX_DISTINCT = 2
const FROZEN_MIN_OCC = 95
// Меньше 5 похожих объявлений вокруг — загрузку района не считаем.
const MARKET_MIN_LISTINGS = 5
// Меньше 30 дневных снимков — слишком мало, чтобы говорить о загрузке.
const MIN_SNAPSHOTS = 30
// Ниже 20% объявление по сути не работает (снято или новое) — его не считаем.
const OWN_OCC_MIN = 20
// Дороже $3000 за ночь на Бали в нашем каталоге нет — это цена в рупиях.
const OWN_ADR_MAX = 3000
const median = (xs: number[]) => {
  if (!xs.length) return null
  const a = [...xs].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}
const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }
function roomBedrooms(roomType: string | null): number | null {
  const m = (roomType ?? '').match(/(one|two|three|four|five|six|\d+)[- ]?bed ?room/i)
  if (!m) return null
  const w = m[1].toLowerCase()
  return WORD_NUM[w] ?? Number(w)
}

function roomKind(roomType: string | null): ListingKind | null {
  const t = (roomType ?? '').toLowerCase()
  if (/villa|house/.test(t)) return 'villa'
  if (/apartment|studio|loft|flat|suite|room/.test(t)) return 'apartment'
  return null
}

// Решение владельца 15.10.2026: если объект виден на Booking — считать
// по тому, что там есть, а не по средней загрузке 60%.
async function loadOwnBooking(complexId: string | null, complexName: string | null, title: string | null, bedrooms: number | null, kind: ListingKind, region: RegionDefaults): Promise<OwnBooking | null> {
  // Ссылка «Комплекс» у части юнитов хранит старый id из Airtable, которого
  // нет среди raw_complexes, — тогда находим комплекс по названию.
  const ids0 = complexId ? [complexId] : []
  if (complexName) {
    // Названия в базе бывают с пробелом на конце — ищем по началу и сверяем без пробелов.
    const name = complexName.trim().toLowerCase()
    const { data: byName } = await sb.from('raw_complexes').select('airtable_id, p:data->>Project').ilike('data->>Project', `${name.replace(/[%_]/g, '')}%`).limit(10)
    for (const r of byName ?? []) if (String(r.p ?? '').trim().toLowerCase() === name) ids0.push(String(r.airtable_id))
  }
  let links: { booking_id: number }[] = []
  if (ids0.length) {
    const { data, error } = await sb.from('complex_booking_match').select('booking_id').in('complex_id', ids0)
    if (error) return null
    links = data ?? []
  }
  // Ни рабочей ссылки, ни названия комплекса (часть апартаментов) — ищем
  // название комплекса из таблицы совпадений в заголовке объекта. Если
  // название у юнита есть, а совпадений нет — значит, его комплекса на Booking
  // нет: «ROYAL OASIS Black Edition» не должен брать объявления «ROYAL OASIS».
  if (!links.length && title && !complexName) {
    const { data: m } = await sb.from('complex_booking_match').select('complex_id, booking_id')
    const cids = [...new Set((m ?? []).map(r => String(r.complex_id)))]
    if (cids.length) {
      const { data: cx } = await sb.from('raw_complexes').select('airtable_id, p:data->>Project').in('airtable_id', cids)
      const t = title.toLowerCase()
      const hit = new Set<string>()
      for (const c of cx ?? []) {
        const n = String(c.p ?? '').trim().toLowerCase()
        // Целым названием: «oasis ii» не должно находиться в «oasis iii».
        const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        if (n.length >= 5 && new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, 'u').test(t)) hit.add(String(c.airtable_id))
      }
      links = (m ?? []).filter(r => hit.has(String(r.complex_id))).map(r => ({ booking_id: Number(r.booking_id) }))
      ids0.push(...hit)
    }
  }
  const actual = await loadActuals(ids0, kind, bedrooms, region)
  if (!links.length) return actual
  const est = await bookingEstimate(links.map(l => Number(l.booking_id)), kind, bedrooms)
  const adr = est?.adr ?? null
  if (actual) return actual.adr != null ? actual : { ...actual, adr, adrSource: adr != null ? 'booking' : null }
  return est
}

/** Загрузка и цена ночи по объявлениям Booking (витрина estatemarket). */
export async function bookingEstimate(ids: number[], kind: ListingKind, bedrooms: number | null): Promise<OwnBooking | null> {
  if (!ids.length) return null
  // Загрузка — среднее по дневным снимкам (с 05.08.2026), а не последний
  // снимок: один день в сезоне сильно скачет. Цена — медиана по недельным
  // снимкам номеров.
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10)
  const [{ data: locs }, { data: rooms }, hist, roomHist] = await Promise.all([
    sb.from('booking_data_locations').select('id, title, occupancy, price').in('id', ids),
    sb.from('booking_data_rooms').select('property_id, room_id, room_type, price').in('property_id', ids),
    pageAll<{ property_id: number; occupancy: number | null }>((from, to) =>
      sb.from('booking_data_history').select('property_id, occupancy').in('property_id', ids).gte('snapshot_date', since).range(from, to)),
    pageAll<{ property_id: number; room_id: number; price: number | null }>((from, to) =>
      sb.from('booking_data_room_history').select('property_id, room_id, price').in('property_id', ids).gte('snapshot_date', since).range(from, to)),
  ])
  const byId = new Map<number, number[]>()
  for (const h of hist) {
    const o = Number(h.occupancy)
    if (h.occupancy == null || !Number.isFinite(o)) continue
    const a = byId.get(Number(h.property_id)) ?? []
    a.push(o)
    byId.set(Number(h.property_id), a)
  }
  const meanOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  // Закрытый календарь: ни загрузку, ни цену такого объявления не берём —
  // цена у него тоже застывшая.
  const frozen = new Set([...byId].filter(([, xs]) =>
    xs.length >= MIN_SNAPSHOTS && new Set(xs.map(x => Math.round(x))).size <= FROZEN_MAX_DISTINCT && meanOf(xs) >= FROZEN_MIN_OCC,
  ).map(([id]) => id))
  const listingOcc = (id: number): number | null => {
    const xs = byId.get(id) ?? []
    if (xs.length < MIN_SNAPSHOTS || frozen.has(id)) return null
    const mean = meanOf(xs)
    return mean >= OWN_OCC_MIN ? mean : null
  }
  const occs = ids.map(listingOcc).filter((o): o is number => o != null)
  const occMed = median(occs)
  // Цены Booking в долларах; изредка в базу попадает цена в рупиях (115 000
  // «долларов» за ночь) — такие отбрасываем, иначе доходность выходит 14 000%.
  const sane = (p: number) => p >= 10 && p <= OWN_ADR_MAX
  const roomPrices = new Map<string, number[]>()
  for (const r of roomHist) {
    const p = Number(r.price)
    if (!sane(p)) continue
    const k = `${r.property_id}:${r.room_id}`
    roomPrices.set(k, [...(roomPrices.get(k) ?? []), p])
  }
  const priced = (rooms ?? []).filter(r => !frozen.has(Number(r.property_id))).map(r => ({
    type: r.room_type as string | null,
    price: median(roomPrices.get(`${r.property_id}:${r.room_id}`) ?? []) ?? (sane(Number(r.price)) ? Number(r.price) : null),
  })).filter((r): r is { type: string | null; price: number } => r.price != null)
  // Цена только похожего номера: та же спальность и тип (вилла/апартаменты),
  // иначе та же спальность, иначе тот же тип без указанных спален. Средняя по
  // всем номерам давала студии 30 м² цену виллы на 4 спальни (35% годовых).
  // Похожего нет — цену берёт калькулятор у соседей.
  const fits = (t: string | null) => { const k = roomKind(t); return k == null || k === kind }
  const tiers = [
    priced.filter(r => bedrooms != null && roomBedrooms(r.type) === bedrooms && fits(r.type)),
    priced.filter(r => bedrooms != null && roomBedrooms(r.type) === bedrooms),
    priced.filter(r => roomBedrooms(r.type) == null && roomKind(r.type) === kind),
  ]
  const adr = median((tiers.find(t => t.length) ?? []).map(r => r.price))
  if (occMed == null && adr == null) return null
  return {
    source: 'booking',
    period: null,
    occupancy: occMed != null ? Math.min(OWN_OCC_CAP, occMed / 100) : null,
    adr: adr != null ? Math.round(adr) : null,
    adrSource: adr != null ? 'booking' : null,
    listings: (locs ?? []).map(l => ({ id: Number(l.id), title: l.title ?? null, occupancy: listingOcc(Number(l.id)) })),
  }
}

/** Загрузка похожих объявлений вокруг (migrations/115): 1,5 км, мало — 3 км. */
async function loadMarketOccupancy(lat: number, lng: number, kind: ListingKind, bedrooms: number | null): Promise<MarketOccupancy | null> {
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10)
  for (const radius of [1500, 3000]) {
    const { data, error } = await sb.rpc('booking_market_occupancy', { p_lat: lat, p_lng: lng, p_radius_m: radius, p_unit_kind: kind, p_bedrooms: bedrooms, p_since: since })
    if (error) throw new Error(error.message)
    const row = (data as { occupancy: number | null; listings: number }[] | null)?.[0]
    if (row?.occupancy != null && row.listings >= MARKET_MIN_LISTINGS) {
      return { occupancy: Math.min(OWN_OCC_CAP, Number(row.occupancy) / 100), listings: row.listings, radiusM: radius }
    }
  }
  return null
}

async function pageAll<T>(q: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return out
  }
}

// Реальные брони управляющей (migrations/113). Тот же тип и число спален,
// иначе тот же тип, иначе весь комплекс.
async function loadActuals(complexIds: string[], kind: ListingKind, bedrooms: number | null, region: RegionDefaults): Promise<OwnBooking | null> {
  if (!complexIds.length) return null
  const { data, error } = await sb.from('complex_rental_actuals')
    .select('unit_kind, bedrooms, period_from, period_to, nights_booked, nights_total, revenue_usd').in('complex_id', complexIds)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const pick = [
    rows.filter(r => r.unit_kind === kind && r.bedrooms === bedrooms),
    rows.filter(r => r.unit_kind === kind),
    rows,
  ].find(g => g.length)
  if (!pick) return null
  const booked = pick.reduce((s, r) => s + Number(r.nights_booked), 0)
  const total = pick.reduce((s, r) => s + Number(r.nights_total), 0)
  if (!total) return null
  const from = pick.map(r => String(r.period_from)).sort()[0]
  const to = pick.map(r => String(r.period_to)).sort().at(-1)!
  const months = Math.round((Date.parse(to) - Date.parse(from)) / (30.44 * 86_400_000))
  // Выручка управляющей уже за вычетом скидок и комиссии площадки, а
  // калькулятор вычитает их сам из цены витрины — переводим обратно в цену
  // витрины, чтобы после вычетов вышла ровно реальная выручка.
  const withRev = pick.filter(r => r.revenue_usd != null && Number(r.nights_booked) > 0)
  const revNights = withRev.reduce((s, r) => s + Number(r.nights_booked), 0)
  const realAdr = revNights ? withRev.reduce((s, r) => s + Number(r.revenue_usd), 0) / revNights : null
  const adr = realAdr != null ? Math.round(realAdr / (region.adrRealizationByScenario.median * (1 - region.platformFeePct))) : null
  return {
    source: 'actual', period: { from, to, months }, occupancy: Math.min(OWN_OCC_CAP, booked / total),
    adr, adrSource: adr != null ? 'revenue' : null, listings: [],
  }
}

export type MapCompetitor = {
  id: string
  lat: number
  lng: number
  adr: number
  bedrooms: number | null
  isMatch: boolean
}

export type NearbyMatchCard = {
  id: string
  name: string
  complex: string | null
  url: string | null
  photo: string | null
  rating: number | null
  reviews: number | null
  bedrooms: number | null
  area: number | null
  adr: number
  distanceKm: number
  lat: number
  lng: number
}

function detectPool(d: Record<string, unknown>): boolean | null {
  const explicit = firstString(d['Бассейн']) ?? firstString(d['Pool'])
  if (explicit) {
    if (/нет|no/i.test(explicit)) return false
    if (/[а-яa-z]/i.test(explicit)) return true
  }
  return null
}

export type ListingKind = 'villa' | 'apartment'

export async function buildSnapshot(villaId: string, kind: ListingKind = 'villa'): Promise<InvestmentSnapshot | null> {
  const table = kind === 'apartment' ? 'raw_apartments' : 'raw_villas'
  const { data: rows, error } = await sb.from(table).select('airtable_id, data').eq('airtable_id', villaId).limit(1)
  if (error) { console.error('[investment] db error:', error.message); return null }
  const row = (rows?.[0] as Row | undefined)
  if (!row) return null
  const d = row.data
  if (d?.['Опубликовать'] !== true) return null

  const lat = numberOrNull(d['Geo'])
  const lng = numberOrNull(d['Geo 2'])
  if (lat == null || lng == null) return null

  const title = firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя']) ?? villaId
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  const askingPrice = numberOrNull(d['price'] ?? d['Цена'])
  const leaseholdYearsLeft = numberOrNull(d['Leasehold'] ?? d['Leashold'])
  const hasPool = detectPool(d)
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])

  const baseRegion = regionFor(lat, lng)
  // Загрузка: вместо одних 60% для всех — загрузка похожих объявлений вокруг.
  // Проверено 16.10.2026 на 39 комплексах со своими объявлениями на Booking:
  // ошибка 6,5 п. против 22 п. у 60% (.tmp-rank/calib.ts).
  const marketOccupancy = await loadMarketOccupancy(lat, lng, kind, bedrooms).catch(() => null)
  const region: RegionDefaults = marketOccupancy ? {
    ...baseRegion,
    occupancyByScenario: {
      bad: Math.max(0.3, marketOccupancy.occupancy - 0.1),
      median: marketOccupancy.occupancy,
      good: Math.min(OWN_OCC_CAP, marketOccupancy.occupancy + 0.1),
    },
  } : baseRegion
  const complexId = Array.isArray(d['Комплекс']) ? (d['Комплекс'] as unknown[]).map(String)[0] ?? null : firstString(d['Комплекс'])
  const ownBookingP = loadOwnBooking(complexId, firstString(d['Комплекс 1']), title, bedrooms, kind, region).catch(() => null)

  // Pull data: 2km competitors + nearby places + baliforum curated places
  const [allInRadius, places, baliforum] = await Promise.all([
    loadNearby(lat, lng, 2),
    loadNearbyPlaces(villaId),
    loadBaliforumNearby(lat, lng, 1.5),
  ])
  const beaches = places?.byCategory.beach ?? []
  const zoneInfo = classifyZone(beaches)
  const target = { lat, lng, bedrooms, area, hasPool }
  let matchResult = matchCompetitors(allInRadius, target, beaches)
  // В тихих районах (Тегаллаланг, Табанан) в 2 км бывает ноль похожих
  // объектов, и калькулятор не считался вовсе. Расширяем радиус ступенями,
  // пока не наберётся выборка, — и виджет говорит, в каком радиусе считали.
  let searchRadiusKm: number = SEARCH_RADII_KM[0]
  let compsInRadius = allInRadius
  for (const r of SEARCH_RADII_KM.slice(1)) {
    if (matchResult.matches.length >= MIN_MATCHES_FOR_CALC) break
    const wider = await loadNearby(lat, lng, r)
    const widerMatch = matchCompetitors(wider, target, beaches, r)
    if (widerMatch.matches.length <= matchResult.matches.length) continue
    matchResult = widerMatch
    compsInRadius = wider
    searchRadiusKm = r
  }

  // EMERGING_MARKET proxy: <30 listings within 1km radius
  const within1km = allInRadius.filter(c => c.distanceKm <= 1).length
  const emergingMarket = within1km < 30

  // Residential (yellow) land — daily/short-term tourist rental is illegal,
  // so a daily-rental yield calculator is misleading. Skip the scenarios and
  // the rental references; the widget shows an explanatory note instead.
  const rentalRestricted = isDailyRentalRestricted(firstString(d['Land color']))

  let scenarios: ScenarioBundle | null = null
  let references: NearbyMatchCard[] | null = null
  let adrBasis: InvestmentSnapshot['adrBasis'] = 'matches'
  // Помесячная аренда (lib/investment/monthly.ts): на жилой земле — вместо
  // посуточной, у остальных вилл — для сравнения. Ставки есть только по виллам.
  const monthly: MonthlyBundle | null = rentalRestricted || kind === 'villa'
    ? await monthlyRentNear(lat, lng, bedrooms).catch(() => null)
    : null
  if (rentalRestricted) {
    // leave scenarios + references null
  } else {
    if (matchResult.mode === 'references') references = matchResult.matches.slice(0, 5).map(toCard)
    // Калькулятор показываем всегда (решение владельца 14.10.2026): его можно
    // покрутить и без выборки. Мало похожих — ставка по ним; ни одного — по
    // объявлениям в самом широком радиусе с близким числом спален (без
    // фильтров площади, бассейна и пляжа), а виджет пишет, что ставка примерная.
    // Все объявления подряд брать нельзя: у 7-спальной виллы в Пандаве вышло
    // $52 за ночь — это номера гостиниц.
    let basis = matchResult.matches
    if (basis.length === 0) {
      const wide = await loadNearby(lat, lng, SEARCH_RADII_KM[SEARCH_RADII_KM.length - 1])
      basis = wide
      if (bedrooms != null) {
        for (const tol of [1, 2, 3]) {
          basis = wide.filter(c => c.bedrooms != null && Math.abs(c.bedrooms - bedrooms) <= tol)
          if (basis.length >= MIN_MATCHES_FOR_CALC) break
        }
        // Ничего близкого (вилла на 11 спален) — десять самых близких по спальням.
        if (basis.length === 0) {
          basis = wide.filter(c => c.bedrooms != null)
            .sort((a, b) => Math.abs(a.bedrooms! - bedrooms) - Math.abs(b.bedrooms! - bedrooms))
            .slice(0, 10)
        }
        if (basis.length === 0) basis = wide
      }
      adrBasis = 'area'
    } else if (matchResult.mode === 'references') {
      adrBasis = 'few'
    }
    // Цена ночи — между медианой и верхней четвертью соседей: на 31 комплексе
    // со своими объявлениями медиана соседей занижала цену на 26%, середина
    // p50–p75 — почти без перекоса (новые объекты сдаются дороже старых).
    // Цена соседей — это средний старый фонд, а дорогой объект сдаётся дороже.
    // Поэтому ставка — среднее геометрическое цены соседей и «нормы» для
    // объекта такой стоимости (adrPerPriceUsd). На тех же комплексах ошибка
    // дохода 25% против 33% только по соседям (.tmp-rank/calib.ts).
    const q = basis.length > 0 ? adrPercentiles(basis) : null
    const byPrice = askingPrice != null && askingPrice > 0 ? askingPrice * region.adrPerPriceUsd[kind] : null
    const blend = (nb: number) => byPrice != null ? Math.sqrt(nb * byPrice) : nb
    const pcts = q && { ...q, p25: blend(q.p50), p50: blend((q.p50 + q.p75) / 2), p75: blend(q.p75) }
    if (pcts) scenarios = buildScenarios(
      pcts,
      // Налоговый статус по умолчанию — нерезидент: большинство покупателей
      // не имеют индонезийского NPWP, и это консервативная сторона.
      // В виджете статус переключается.
      { area, bedrooms, askingPrice, leaseholdYearsLeft, taxStatus: 'nonResident', region },
      region.occupancyByScenario,
    )
  }

  const confidence: Confidence = matchResult.mode === 'standard' ? 'high' : matchResult.mode === 'reduced' ? 'medium' : 'low'
  const weakPerformance = scenarios != null && scenarios.bad.capRate != null && scenarios.bad.capRate < region.capRateThresholdWeak
  const leaseholdRisk = scenarios != null && (scenarios.bad.leaseholdRisk || scenarios.median.leaseholdRisk)

  const competitors = matchResult.matches.slice(0, 50).map(toCard)
  const matchIds = new Set(matchResult.matches.map(m => m.id))
  // Группируем все объекты в радиусе по координатам, чтобы не плодить маркеры на одной точке
  const groupedMap = new Map<string, { lat: number; lng: number; adrs: number[]; beds: number[]; ids: string[]; matchAny: boolean }>()
  for (const c of compsInRadius) {
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`
    const g = groupedMap.get(key) ?? { lat: c.lat, lng: c.lng, adrs: [], beds: [], ids: [], matchAny: false }
    g.adrs.push(c.price)
    if (c.bedrooms != null) g.beds.push(c.bedrooms)
    g.ids.push(c.id)
    if (matchIds.has(c.id)) g.matchAny = true
    groupedMap.set(key, g)
  }
  const mapCompetitors: MapCompetitor[] = [...groupedMap.values()].map(g => ({
    id: g.ids[0],
    lat: g.lat,
    lng: g.lng,
    adr: Math.round(g.adrs.reduce((s, v) => s + v, 0) / g.adrs.length),
    bedrooms: g.beds.length ? Math.round(g.beds.reduce((s, v) => s + v, 0) / g.beds.length) : null,
    isMatch: g.matchAny,
  })).slice(0, 250)
  // Merge baliforum curated places into byCategory under their mapped category
  // keys before scoring. They appear with the same NearbyPlace shape so the
  // existing anchor selectors pick them up without further glue.
  const byCategoryEnriched = mergeBaliforumIntoCategories(places?.byCategory ?? {}, baliforum)
  const infra = places || baliforum.length
    ? scoreInfra(byCategoryEnriched)
    : { metrics: { premiumRestaurants: 0, beachClubs: 0, topCafes: 0, fitness: 0, nightclubs: 0, avgRating: null, reviewDensity: 0, totalAnchors: 0 }, composite: 0, anchors: [] }

  // Photo from corresponding photos manifest (best-effort)
  const photo = await firstPhoto(villaId, kind)

  return {
    villaId,
    generatedAt: new Date().toISOString(),
    villa: { title, lat, lng, bedrooms, area, askingPrice, leaseholdYearsLeft, hasPool, district, photo },
    region,
    zone: {
      applied: matchResult.appliedZone,
      raw: matchResult.rawZone,
      title: zoneTitle(matchResult.appliedZone),
      expanded: matchResult.expanded,
      nearestBeach: zoneInfo.nearestBeach,
      walkingMeters: zoneInfo.walkingMeters,
    },
    mode: matchResult.mode,
    confidence,
    matchSampleSize: matchResult.matches.length,
    scenarios,
    adrBasis,
    references,
    monthly,
    competitors,
    mapCompetitors,
    totalCompetitorsInRadius: compsInRadius.length,
    searchRadiusKm,
    infra,
    anchors: infra.anchors,
    nearbyByCategory: byCategoryEnriched,
    ownBooking: await ownBookingP,
    marketOccupancy,
    flags: {
      emergingMarket,
      weakPerformance,
      leaseholdRisk,
      isLuxury: matchResult.isLuxury,
      expandedZone: matchResult.expanded,
      rentalRestricted,
    },
  }
}

// Baliforum-curated places are stored in public.baliforum_places (see migration
// 036). The list is hand-picked by Russian-speaking community moderators, so
// it doubles as a third-party "is this address actually nice?" signal alongside
// Google rating counts. We pull a small bounding-box slice per snapshot and
// merge into the existing category map so the anchor selector reuses them.
type BaliforumRow = {
  slug: string
  name: string | null
  category: string | null
  lat: number
  lng: number
  rating: number | null
  reviews: number | null
  google_place_id: string | null
  address: string | null
  url: string | null
  photo: string | null
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function loadBaliforumNearby(lat: number, lng: number, radiusKm: number): Promise<NearbyPlace[]> {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  const { data, error } = await sb
    .from('baliforum_places')
    .select('slug,name,category,lat,lng,rating,reviews,google_place_id,address,url,photo')
    .gte('lat', lat - dLat).lte('lat', lat + dLat)
    .gte('lng', lng - dLng).lte('lng', lng + dLng)
    .limit(200)
  if (error) {
    // Don't blow the snapshot if the table is missing/empty — fall through
    // to the Google-only path. Errors in this path are non-fatal.
    return []
  }
  const out: NearbyPlace[] = []
  for (const r of (data ?? []) as BaliforumRow[]) {
    const d = distanceKm(lat, lng, r.lat, r.lng)
    if (d > radiusKm) continue
    out.push({
      id: r.google_place_id ?? `baliforum:${r.slug}`,
      name: r.name,
      rating: r.rating,
      reviews: r.reviews,
      primaryType: r.category,
      types: r.category ? [r.category, 'baliforum'] : ['baliforum'],
      priceLevel: null,
      address: r.address,
      mapsUrl: r.url,
      lat: r.lat,
      lng: r.lng,
      distanceKm: d,
    })
  }
  return out
}

function mergeBaliforumIntoCategories(
  byCategory: Record<string, NearbyPlace[]>,
  baliforum: NearbyPlace[],
): Record<string, NearbyPlace[]> {
  if (baliforum.length === 0) return byCategory
  const out: Record<string, NearbyPlace[]> = { ...byCategory }
  for (const p of baliforum) {
    const cat = p.primaryType || 'baliforum'
    const existing = out[cat] ?? []
    // Dedupe by Google place_id when both Google sync and Baliforum found
    // the same spot — keep whichever entry was already there (Google's data
    // tends to have more accurate review counts).
    if (existing.some(e => e.id === p.id)) continue
    out[cat] = [...existing, p]
  }
  return out
}

function toCard(m: import('../competitor-utils').CompetitorWithDistance): NearbyMatchCard {
  return {
    id: m.id,
    name: m.name,
    complex: m.complex,
    url: m.url,
    photo: m.photo,
    rating: m.rating,
    reviews: m.reviews,
    bedrooms: m.bedrooms,
    area: m.area,
    adr: m.price,
    distanceKm: m.distanceKm,
    lat: m.lat,
    lng: m.lng,
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URLS: Record<ListingKind, string> = {
  villa: `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`,
  apartment: `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`,
}
const _photoCache: Partial<Record<ListingKind, { ts: number; data: Record<string, string[]> }>> = {}
async function firstPhoto(villaId: string, kind: ListingKind): Promise<string | null> {
  const cached = _photoCache[kind]
  if (!cached || Date.now() - cached.ts > 60 * 60 * 1000) {
    try {
      const r = await fetch(PHOTO_MANIFEST_URLS[kind], { next: { revalidate: 86400 } })
      if (r.ok) _photoCache[kind] = { ts: Date.now(), data: await r.json() }
    } catch { /* ignore */ }
  }
  return _photoCache[kind]?.data[villaId]?.[0] ?? null
}
