// Ссылка на локацию в Google Maps: одно каноническое поле и разбор координат.
//
// Зачем: в raw_complexes ссылка живёт под ключом Airtable-времён
// `Link from Google maps on location`. Поля в /admin/data динамические (сетка
// показывает ВСЕ ключи, которые есть в data), поэтому кнопка «Добавить поле»
// легко рождает второй столбец с тем же смыслом — «Link from Google maps»,
// «Google maps», «Ссылка Google Maps». Здесь один канонический ключ, узкий
// распознаватель дублей и разбор координат из самой ссылки.
//
// Карта на странице ЖК рисуется по `Geo` / `Geo 2`, а НЕ по этой ссылке — она
// нужна только для кнопки «Открыть на Google Maps». Поэтому вставленная
// ссылка обязана дать координаты: lib/admin/map-link-geo.ts заполняет из неё
// Geo/Geo 2 при сохранении, а страница ЖК подстраховывается тем же разбором.

/** Ключ, под которым ссылка хранится и редактируется. Всё остальное — дубль. */
export const MAP_LINK_FIELD = 'Link from Google maps on location'

/** Ключи в стиле «латиница/кириллица + пробелы/знаки» сравниваем по сути. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-zа-я0-9]/g, '')
}

/** Похож ли ключ на «ссылку на Google Maps» — т.е. на дубль канонического. */
export function isMapLinkKey(key: string): boolean {
  const k = normalizeKey(key)
  if (!k.includes('google')) return false
  return k.includes('map') || k.includes('карт') || k.includes('мап')
}

function asUrl(v: unknown): string | null {
  if (typeof v === 'string') {
    const s = v.trim()
    return /^https?:\/\//i.test(s) ? s : null
  }
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = asUrl(item)
      if (s) return s
    }
    return null
  }
  if (v && typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
    return asUrl((v as Record<string, unknown>).value)
  }
  return null
}

/**
 * Ссылка на локацию из записи: сначала канонический ключ, затем любой дубль,
 * который редактор мог завести руками. Так карта не теряется, пока дубли не
 * вычищены из data (scripts/fix-complex-map-links.mjs).
 */
export function pickMapLink(data: Record<string, unknown>): string | null {
  const canonical = asUrl(data[MAP_LINK_FIELD])
  if (canonical) return canonical
  for (const key of Object.keys(data).sort()) {
    if (key === MAP_LINK_FIELD || !isMapLinkKey(key)) continue
    const url = asUrl(data[key])
    if (url) return url
  }
  return null
}

/** Ключи-дубли, которые есть в записи и не пусты (канонический не считается). */
export function duplicateMapLinkKeys(data: Record<string, unknown>): string[] {
  return Object.keys(data).filter(k => k !== MAP_LINK_FIELD && isMapLinkKey(k))
}

export type LatLng = { lat: number; lng: number }

function validPair(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

const NUM = String.raw`-?\d+(?:\.\d+)?`
// `!3d-8.65!4d115.13` — координаты самой точки (самое точное, что есть в URL).
const PIN_RE = new RegExp(String.raw`!3d(${NUM})!4d(${NUM})`)
// `/@-8.65,115.13,17z` — центр вида; годится, когда точки в ссылке нет.
const AT_RE = new RegExp(String.raw`@(${NUM}),(${NUM})`)
// `?q=`, `&query=`, `ll=`, `center=`, `destination=` — «lat,lng» в параметре.
const PARAM_RE = new RegExp(
  String.raw`[?&](?:q|query|ll|sll|center|destination|daddr)=(${NUM})(?:%2C|,)\s*(${NUM})`,
  'i',
)

/**
 * Координаты из ссылки Google Maps. Короткие ссылки (maps.app.goo.gl,
 * goo.gl/maps) координат не содержат — их сначала надо развернуть, этим
 * занимается lib/admin/map-link-geo.ts на сервере.
 */
export function mapLinkCoords(url: string | null | undefined): LatLng | null {
  if (!url) return null
  const s = String(url)
  for (const re of [PIN_RE, PARAM_RE, AT_RE]) {
    const m = s.match(re)
    if (m) {
      const pair = validPair(Number(m[1]), Number(m[2]))
      if (pair) return pair
    }
  }
  // Голая пара координат, вставленная вместо ссылки.
  const bare = s.trim().match(new RegExp(String.raw`^(${NUM})\s*,\s*(${NUM})$`))
  if (bare) return validPair(Number(bare[1]), Number(bare[2]))
  return null
}

/** Короткая ссылка-редирект, из которой координаты вытащить можно только
 *  после запроса к Google. */
export function isShortMapLink(url: string): boolean {
  return /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(url.trim())
}
