// Страна посетителя. Нужна ровно для одного: внутри Индонезии цены по
// умолчанию показываем в рупиях. Сами страницы статические, поэтому страну
// узнаём уже в браузере — и кладём в localStorage на неделю, чтобы на
// браузер приходился один вызов, а не по одному на каждую страницу.

const LS_KEY = 'balinsky.geo'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

// Часовые пояса Индонезии. Телефон и ноутбук выставляют их по месту сами,
// так что это мгновенная подсказка «мы в стране» — показать рупии, не дожидаясь
// ответа /api/geo, который потом подтвердит или поправит.
const ID_TIMEZONES = new Set([
  'Asia/Jakarta',
  'Asia/Pontianak',
  'Asia/Makassar',
  'Asia/Jayapura',
])

export function looksIndonesianByTimezone(): boolean {
  try {
    return ID_TIMEZONES.has(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    return false
  }
}

function cached(): string | null | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return undefined
    const v = JSON.parse(raw) as { country?: unknown; ts?: unknown }
    if (typeof v.ts !== 'number' || Date.now() - v.ts > TTL_MS) return undefined
    return typeof v.country === 'string' ? v.country : null
  } catch {
    return undefined
  }
}

// ISO-код страны ('ID', 'RU', …) или null, если определить не вышло.
export async function resolveCountry(): Promise<string | null> {
  const hit = cached()
  if (hit !== undefined) return hit
  try {
    const r = await fetch('/api/geo', { cache: 'no-store' })
    if (!r.ok) return null
    const j = (await r.json()) as { country?: unknown }
    const country = typeof j.country === 'string' ? j.country : null
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ country, ts: Date.now() }))
    } catch { /* приватный режим */ }
    return country
  } catch {
    return null
  }
}
