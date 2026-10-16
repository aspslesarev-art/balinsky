// «Для жизни»: удобно ли жить в объекте — школа, пляж, врачи, магазин, тишина,
// кафе, пешком, воздух, жара, вулкан. Только из данных объекта: места вокруг
// (Google Places, scripts/sync-nearby-places.mjs — расстояние по прямой),
// дороги, мечети и самолёты (OpenStreetMap, lib/living-geo.ts), погода и
// воздух (listing_geo_facts), время в пути в час пик, срок аренды земли.
//
// Расстояние по прямой, а не время: пересчитать километры в минуты без
// маршрута значило бы угадывать. Где места в радиусе поиска нет — пишем
// «дальше N км», а не «нет».
import type { NearbyPlace } from './nearby-places'
import type { Climate, Routes } from './complex-access'
import type { Tone } from './listing-verdict'
import type { GeoNoise } from './living-geo'

// Радиусы поиска по категориям — те же, что в scripts/sync-nearby-places.mjs.
const SEARCH_KM = { international_school: 8, school: 5, beach: 5, hospital: 5, supermarket: 1.5 } as const

// Пороги «хорошо / есть минусы», км по прямой. Ниже «хорошо», до второго —
// «есть минусы», дальше — «далеко».
const LIMITS = {
  school: [3, 7],
  beach: [2, 6],
  health: [3, 8],
  shop: [1, 3],
} as const

const NEAR_KM = 0.5

export type LivingRowKey = 'school' | 'beach' | 'health' | 'shop' | 'quiet' | 'cafes' | 'walk' | 'air' | 'heat' | 'volcano'

export type NoiseReason =
  | { k: 'bars'; n: number }
  | { k: 'road'; m: number; cls: 'big' | 'mid' }
  | { k: 'mosque'; m: number }
  | { k: 'flight'; v: 'near' | 'path' }
  | { k: 'build' }

export type LivingRow = {
  key: LivingRowKey
  tone: Tone
  /** Ближайшее место, км по прямой; null — в радиусе поиска нет. */
  km?: number | null
  /** Радиус поиска, км — для «дальше N км». */
  searchKm?: number
  name?: string | null
  /** Школа — международная (а не местная). */
  intl?: boolean
  /** Врачи — аптека рядом. */
  pharmacyKm?: number | null
  /** Тишина — что шумит рядом. */
  reasons?: NoiseReason[]
  /** Кафе — сколько кафе и ресторанов в 500 м, коворкинг и спорт. */
  count?: number
  coworkKm?: number | null
  gymKm?: number | null
  /** Пешком — пляж и кафе рядом. */
  beachKm?: number | null
  /** Воздух — индекс ISPU (до 50 — хороший по нормам Индонезии). */
  ispu?: number
  /** Жара — самый жаркий месяц, средний дневной максимум; влажность; высота. */
  tMax?: number | null
  rh?: number | null
  elevationM?: number | null
  /** Вулкан. */
  volcano?: 'agung' | 'batur'
}

export type LivingFacts = {
  rows: LivingRow[]
  tone: Tone
  /** Время в пути в час пик, мин: до аэропорта и до ближайшего центра. */
  airportMin: number | null
  hub: { key: 'canggu' | 'ubud' | 'uluwatu' | 'sanur'; min: number } | null
  leaseYears: number | null
  bedrooms: number | null
}

function nearest(list: NearbyPlace[] | undefined, filter?: (p: NearbyPlace) => boolean): NearbyPlace | null {
  let best: NearbyPlace | null = null
  for (const p of list ?? []) {
    if (filter && !filter(p)) continue
    if (!Number.isFinite(p.distanceKm)) continue
    if (!best || p.distanceKm < best.distanceKm) best = p
  }
  return best
}

function toneByKm(km: number | null, [good, ok]: readonly [number, number]): Tone {
  if (km == null) return 'minus'
  return km <= good ? 'plus' : km <= ok ? 'warn' : 'minus'
}

// Больница или клиника, а не частный кабинет врача: «doctor» в Places — это
// и стоматолог, и массажист.
function isClinic(p: NearbyPlace): boolean {
  return p.primaryType === 'hospital' || p.primaryType === 'medical_clinic' || p.types?.includes('hospital') || /hospital|clinic|klinik|rumah sakit|rs |bimc|siloam/i.test(p.name ?? '')
}

// Магазин — супермаркет или минимаркет; лавка у дороги — только если больше
// ничего рядом нет.
function isStore(p: NearbyPlace): boolean {
  const n = p.name ?? ''
  if (/warung|toko|traditional|kios|kiosk/i.test(n)) return false
  return p.primaryType === 'supermarket' || /mart|market|supermarket|grocer|pepito|coco|frestive|bintang|grand lucky|carrefour|lotte|hypermart/i.test(n)
}

// Пляж — сам пляж, а не кафе или отель с «beach» в названии.
function isBeach(p: NearbyPlace): boolean {
  if (/warung|уорунг|cafe|café|restaurant|resto|hotel|villa|resort|bar\b|club/i.test(p.name ?? '')) return false
  return p.primaryType === 'beach' || p.types?.includes('beach') || /beach|pantai|пляж/i.test(p.name ?? '')
}

function uniqNear(...lists: (NearbyPlace[] | undefined)[]): number {
  const ids = new Set<string>()
  for (const l of lists) for (const p of l ?? []) if (p.distanceKm <= NEAR_KM) ids.add(p.id)
  return ids.size
}

export function computeLivingFacts(args: {
  byCategory: Record<string, NearbyPlace[]> | null
  routes: Routes | null
  leaseYears: number | null
  bedrooms: number | null
  noise?: GeoNoise | null
  climate?: Climate | null
  ispu?: number | null
  elevationM?: number | null
}): LivingFacts | null {
  const b = args.byCategory
  if (!b) return null

  // Международная школа важнее обычной: семьи иностранцев учат детей там.
  const intl = nearest(b.international_school)
  const school = intl ?? nearest(b.school)
  const beach = nearest(b.beach, isBeach) ?? nearest(b.beach)
  const clinic = nearest(b.hospital, isClinic)
  const pharmacy = nearest(b.pharmacy)
  const shop = nearest(b.supermarket, isStore) ?? nearest(b.supermarket)

  // Тишина: баллы за то, что шумит. 0 — тихо, 1–2 — бывает шумно, 3+ — шумно.
  const bars = uniqNear(b.nightlife, b.beachclub)
  const reasons: NoiseReason[] = []
  let noisePts = 0
  if (bars >= 5) { noisePts += 2; reasons.push({ k: 'bars', n: bars }) }
  else if (bars >= 2) { noisePts += 1; reasons.push({ k: 'bars', n: bars }) }
  const n = args.noise
  if (n?.road_m != null && n.road_class) {
    if (n.road_class === 'big' && n.road_m <= 80) { noisePts += 2; reasons.push({ k: 'road', m: n.road_m, cls: 'big' }) }
    else if (n.road_class === 'big' && n.road_m <= 250) { noisePts += 1; reasons.push({ k: 'road', m: n.road_m, cls: 'big' }) }
    else if (n.road_class === 'mid' && n.road_m <= 50) { noisePts += 1; reasons.push({ k: 'road', m: n.road_m, cls: 'mid' }) }
  }
  if (n?.mosque_m != null && n.mosque_m <= 250) { noisePts += 1; reasons.push({ k: 'mosque', m: n.mosque_m }) }
  if (n?.flight === 'near') { noisePts += 2; reasons.push({ k: 'flight', v: 'near' }) }
  else if (n?.flight === 'path') { noisePts += 1; reasons.push({ k: 'flight', v: 'path' }) }
  const buildRank = args.climate?.buildings?.growth_rank ?? null
  if (buildRank != null && buildRank >= 85) { noisePts += 1; reasons.push({ k: 'build' }) }
  const quietTone: Tone = noisePts === 0 ? 'plus' : noisePts <= 2 ? 'warn' : 'minus'

  const cafes = uniqNear(b.cafe, b.restaurant)
  const cowork = nearest(b.coworking), gym = nearest(b.wellness)
  const cafesTone: Tone = cafes >= 5 ? 'plus' : cafes >= 2 ? 'warn' : 'minus'

  const beachKm = beach?.distanceKm ?? null
  const walkTone: Tone = beachKm != null && beachKm <= 1 && cafes >= 3 ? 'plus'
    : (beachKm != null && beachKm <= 1.5) || cafes >= 3 ? 'warn' : 'minus'

  const rows: LivingRow[] = [
    { key: 'school', tone: toneByKm(school?.distanceKm ?? null, LIMITS.school), km: school?.distanceKm ?? null, searchKm: intl || !school ? SEARCH_KM.international_school : SEARCH_KM.school, name: school?.name ?? null, intl: !!intl },
    { key: 'beach', tone: toneByKm(beachKm, LIMITS.beach), km: beachKm, searchKm: SEARCH_KM.beach, name: beach?.name ?? null },
    { key: 'health', tone: toneByKm(clinic?.distanceKm ?? null, LIMITS.health), km: clinic?.distanceKm ?? null, searchKm: SEARCH_KM.hospital, name: clinic?.name ?? null, pharmacyKm: pharmacy?.distanceKm ?? null },
    // Магазин ищется в 1,5 км: не нашли — значит дальше, это «есть минусы», а не «далеко».
    { key: 'shop', tone: shop ? toneByKm(shop.distanceKm, LIMITS.shop) : 'warn', km: shop?.distanceKm ?? null, searchKm: SEARCH_KM.supermarket, name: shop?.name ?? null },
    { key: 'quiet', tone: quietTone, reasons },
    { key: 'cafes', tone: cafesTone, count: cafes, coworkKm: cowork?.distanceKm ?? null, gymKm: gym?.distanceKm ?? null },
    { key: 'walk', tone: walkTone, beachKm, count: cafes },
  ]

  // Воздух: ISPU — индекс Индонезии, до 50 «хороший», 51–100 «умеренный».
  if (args.ispu != null) rows.push({ key: 'air', tone: args.ispu <= 50 ? 'plus' : args.ispu <= 100 ? 'warn' : 'minus', ispu: Math.round(args.ispu) })

  // Жара: самый жаркий месяц по среднему дневному максимуму. Не минус —
  // на побережье Бали жарко везде (днём 30–32°); плюс там, где до 28° — на высоте.
  const months = Object.entries(args.climate ?? {}).filter(([k]) => /^\d{2}$/.test(k)).map(([, v]) => v as { t_max: number | null; rh: number | null })
  const tMaxes = months.map(m => m.t_max).filter((x): x is number => x != null)
  const rhs = months.map(m => m.rh).filter((x): x is number => x != null)
  if (tMaxes.length) {
    const tMax = Math.round(Math.max(...tMaxes))
    rows.push({ key: 'heat', tone: tMax <= 28 ? 'plus' : 'warn', tMax, rh: rhs.length ? Math.round(rhs.reduce((s, x) => s + x, 0) / rhs.length) : null, elevationM: args.elevationM ?? null })
  }

  // Вулкан — только ближе 25 км (lib/living-geo.ts). В 2017 году зону
  // эвакуации вокруг Агунга расширяли до 12 км.
  if (n?.volcano && n.volcano_km != null) {
    rows.push({ key: 'volcano', tone: n.volcano_km <= 12 ? 'minus' : n.volcano_km <= 20 ? 'warn' : 'plus', km: n.volcano_km, volcano: n.volcano })
  }

  // Итог: школа, пляж, врачи, магазин, тишина; воздух и вулкан — только если «далеко/плохо».
  const core = rows.filter(r => ['school', 'beach', 'health', 'shop', 'quiet'].includes(r.key) || ((r.key === 'air' || r.key === 'volcano') && r.tone === 'minus'))
  const minus = core.filter(r => r.tone === 'minus').length
  const warn = core.filter(r => r.tone === 'warn').length
  const tone: Tone = minus >= 2 ? 'minus' : minus === 1 || warn >= 3 ? 'warn' : 'plus'

  const r = args.routes
  const hubs = (['canggu', 'ubud', 'uluwatu', 'sanur'] as const)
    .map(key => ({ key, s: r?.[key]?.s ?? null }))
    .filter((h): h is { key: typeof h.key; s: number } => h.s != null)
    .sort((a, b2) => a.s - b2.s)
  return {
    rows,
    tone,
    airportMin: r?.airport?.s != null ? Math.round(r.airport.s / 60) : null,
    hub: hubs[0] ? { key: hubs[0].key, min: Math.round(hubs[0].s / 60) } : null,
    leaseYears: args.leaseYears,
    bedrooms: args.bedrooms,
  }
}

/** Сжатая версия для каталога и таблицы listing_living. */
export function livingSummary(f: LivingFacts) {
  const row = (k: LivingRowKey) => f.rows.find(r => r.key === k)
  return {
    tone: f.tone,
    school_km: row('school')?.km ?? null,
    beach_km: row('beach')?.km ?? null,
    health_km: row('health')?.km ?? null,
    shop_km: row('shop')?.km ?? null,
    loud_500m: row('quiet')?.reasons?.find(x => x.k === 'bars')?.n ?? 0,
    cafes_500m: row('cafes')?.count ?? null,
    noise_tone: row('quiet')?.tone ?? null,
    // Балл для сортировки «Для жизни»: по главным строкам плюс — 2, есть минусы — 1, далеко — 0.
    score: f.rows.filter(r => ['school', 'beach', 'health', 'shop', 'quiet'].includes(r.key))
      .reduce((s, r) => s + (r.tone === 'plus' ? 2 : r.tone === 'warn' ? 1 : 0), 0),
  }
}

/** listing_living для каталога: id → балл и расстояния. Ошибка — пустая карта
 *  (каталог живёт без режима «Для жизни», а не падает). */
export async function loadLivingMap(kind: 'villa' | 'apartment'): Promise<Map<string, { score: number; school_km: number | null; beach_km: number | null }>> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data, error } = await sb.from('listing_living').select('airtable_id, score, school_km, beach_km').eq('kind', kind).limit(5000)
  if (error) { console.error('[living] listing_living:', error.message); return new Map() }
  const num = (v: unknown) => (v == null ? null : Number(v))
  return new Map((data ?? []).map(r => [String(r.airtable_id), { score: Number(r.score), school_km: num(r.school_km), beach_km: num(r.beach_km) }]))
}

/** Шум и вулкан одного объекта из listing_living (считаются ночью по OSM). */
export async function loadLivingNoise(kind: 'villa' | 'apartment', id: string): Promise<GeoNoise | null> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data, error } = await sb.from('listing_living').select('road_m, road_class, mosque_m, flight, volcano, volcano_km').eq('kind', kind).eq('airtable_id', id).maybeSingle()
  if (error || !data) return null
  return {
    road_m: data.road_m != null ? Number(data.road_m) : null,
    road_class: (data.road_class as GeoNoise['road_class']) ?? null,
    mosque_m: data.mosque_m != null ? Number(data.mosque_m) : null,
    flight: (data.flight as GeoNoise['flight']) ?? null,
    volcano: (data.volcano as GeoNoise['volcano']) ?? null,
    volcano_km: data.volcano_km != null ? Number(data.volcano_km) : null,
  }
}
