// «Для жизни»: удобно ли жить в объекте — школа, пляж, врачи, магазин, тишина,
// дорога. Только из данных объекта: места вокруг (Google Places,
// scripts/sync-nearby-places.mjs — расстояние по прямой), время в пути в час
// пик (geo_facts.routes), риски участка и срок аренды земли.
//
// Расстояние по прямой, а не время: пересчитать километры в минуты без
// маршрута значило бы угадывать. Где места в радиусе поиска нет — пишем
// «дальше N км», а не «нет».
import type { NearbyPlace } from './nearby-places'
import type { Routes } from './complex-access'
import type { Tone } from './listing-verdict'

// Радиусы поиска по категориям — те же, что в scripts/sync-nearby-places.mjs.
const SEARCH_KM = { international_school: 8, school: 5, preschool: 3, beach: 5, hospital: 5, pharmacy: 2, supermarket: 1.5, nightlife: 3, beachclub: 5 } as const

// Пороги «хорошо / есть минусы», км по прямой. Ниже «хорошо», до второго —
// «есть минусы», дальше — «далеко».
const LIMITS = {
  school: [3, 7],
  beach: [2, 6],
  health: [3, 8],
  shop: [1, 3],
} as const

// Бары и клубы в радиусе 500 м: до 1 — тихо, 2–4 — бывает шумно, 5+ — шумно.
const QUIET_KM = 0.5

export type LivingRowKey = 'school' | 'beach' | 'health' | 'shop' | 'quiet'

export type LivingRow = {
  key: LivingRowKey
  tone: Tone
  /** Ближайшее место, км по прямой; null — в радиусе поиска нет. */
  km: number | null
  /** Радиус поиска, км — для «дальше N км». */
  searchKm: number
  name: string | null
  /** Для тишины — сколько баров и клубов в 500 м. */
  count?: number
  /** Для врачей — есть ли аптека рядом. */
  pharmacyKm?: number | null
  /** Для школы — международная (а не местная). */
  intl?: boolean
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

function isStore(p: NearbyPlace): boolean {
  const n = p.name ?? ''
  if (/warung|toko|traditional|kios|kiosk/i.test(n)) return false
  return p.primaryType === 'supermarket' || /mart|market|supermarket|grocer|pepito|coco|frestive|bintang|grand lucky|carrefour|lotte|hypermart/i.test(n)
}

export function computeLivingFacts(args: {
  byCategory: Record<string, NearbyPlace[]> | null
  routes: Routes | null
  leaseYears: number | null
  bedrooms: number | null
}): LivingFacts | null {
  const b = args.byCategory
  if (!b) return null

  // Международная школа важнее обычной: семьи иностранцев учат детей там.
  const intl = nearest(b.international_school)
  const school = intl ?? nearest(b.school)
  const schoolSearch = intl ? SEARCH_KM.international_school : SEARCH_KM.school
  const beach = nearest(b.beach)
  const clinic = nearest(b.hospital, isClinic)
  const pharmacy = nearest(b.pharmacy)
  // Магазин — супермаркет или минимаркет; лавка у дороги («warung») — только
  // если больше ничего рядом нет.
  const shop = nearest(b.supermarket, isStore) ?? nearest(b.supermarket)
  const loud = [...(b.nightlife ?? []), ...(b.beachclub ?? [])].filter(p => p.distanceKm <= QUIET_KM)
  const loudN = new Set(loud.map(p => p.id)).size

  const rows: LivingRow[] = [
    { key: 'school', tone: toneByKm(school?.distanceKm ?? null, LIMITS.school), km: school?.distanceKm ?? null, searchKm: SEARCH_KM.international_school, name: school?.name ?? null, intl: !!intl },
    { key: 'beach', tone: toneByKm(beach?.distanceKm ?? null, LIMITS.beach), km: beach?.distanceKm ?? null, searchKm: SEARCH_KM.beach, name: beach?.name ?? null },
    { key: 'health', tone: toneByKm(clinic?.distanceKm ?? null, LIMITS.health), km: clinic?.distanceKm ?? null, searchKm: SEARCH_KM.hospital, name: clinic?.name ?? null, pharmacyKm: pharmacy?.distanceKm ?? null },
    // Магазин ищется в 1,5 км: не нашли — значит дальше, это «есть минусы», а не «далеко».
    { key: 'shop', tone: shop ? toneByKm(shop.distanceKm, LIMITS.shop) : 'warn', km: shop?.distanceKm ?? null, searchKm: SEARCH_KM.supermarket, name: shop?.name ?? null },
    { key: 'quiet', tone: loudN <= 1 ? 'plus' : loudN <= 4 ? 'warn' : 'minus', km: null, searchKm: QUIET_KM, name: null, count: loudN },
  ]
  // Школа: искали обычную в 5 км, международную в 8 — для «дальше N км» берём больший.
  if (!intl && school) rows[0].searchKm = schoolSearch

  const minus = rows.filter(r => r.tone === 'minus').length
  const warn = rows.filter(r => r.tone === 'warn').length
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

/** Сжатая версия для каталога и таблицы listing_living: ближайшее по каждой строке. */
export function livingSummary(f: LivingFacts) {
  const km = (k: LivingRowKey) => f.rows.find(r => r.key === k)?.km ?? null
  return {
    tone: f.tone,
    school_km: km('school'),
    beach_km: km('beach'),
    health_km: km('health'),
    shop_km: km('shop'),
    loud_500m: f.rows.find(r => r.key === 'quiet')?.count ?? null,
    // Балл для сортировки «Для жизни»: плюс — 2, есть минусы — 1, далеко — 0.
    score: f.rows.reduce((s, r) => s + (r.tone === 'plus' ? 2 : r.tone === 'warn' ? 1 : 0), 0),
  }
}

/** listing_living для каталога: id → балл и расстояния. Ошибка — пустая карта
 *  (каталог живёт без режима «Для жизни», а не падает). */
export async function loadLivingMap(kind: 'villa' | 'apartment'): Promise<Map<string, { score: number; school_km: number | null; beach_km: number | null }>> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data, error } = await sb.from('listing_living').select('airtable_id, score, school_km, beach_km').eq('kind', kind).limit(5000)
  if (error) { console.error('[living] listing_living:', error.message); return new Map() }
  const n = (v: unknown) => (v == null ? null : Number(v))
  return new Map((data ?? []).map(r => [String(r.airtable_id), { score: Number(r.score), school_km: n(r.school_km), beach_km: n(r.beach_km) }]))
}
