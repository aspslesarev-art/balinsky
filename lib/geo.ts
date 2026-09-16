// Страна посетителя. Нужна ровно для одного: показать цены в местной валюте
// (в Индонезии — рупии, в России — рубли). Сами страницы статические, поэтому
// страну узнаём уже в браузере — и кладём в localStorage на неделю, чтобы на
// браузер приходился один вызов, а не по одному на каждую страницу.

const LS_KEY = 'balinsky.geo'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

// Часовые пояса стран, для которых у нас есть своя валюта. Телефон и ноутбук
// выставляют пояс по месту сами, так что это мгновенная подсказка «мы здесь» —
// показать местную валюту, не дожидаясь ответа /api/geo, который потом
// подтвердит или поправит.
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Jakarta': 'ID',
  'Asia/Pontianak': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'Europe/Kaliningrad': 'RU',
  'Europe/Moscow': 'RU',
  'Europe/Simferopol': 'RU',
  'Europe/Kirov': 'RU',
  'Europe/Volgograd': 'RU',
  'Europe/Astrakhan': 'RU',
  'Europe/Saratov': 'RU',
  'Europe/Ulyanovsk': 'RU',
  'Europe/Samara': 'RU',
  'Asia/Yekaterinburg': 'RU',
  'Asia/Omsk': 'RU',
  'Asia/Novosibirsk': 'RU',
  'Asia/Barnaul': 'RU',
  'Asia/Tomsk': 'RU',
  'Asia/Novokuznetsk': 'RU',
  'Asia/Krasnoyarsk': 'RU',
  'Asia/Irkutsk': 'RU',
  'Asia/Chita': 'RU',
  'Asia/Yakutsk': 'RU',
  'Asia/Khandyga': 'RU',
  'Asia/Vladivostok': 'RU',
  'Asia/Ust-Nera': 'RU',
  'Asia/Magadan': 'RU',
  'Asia/Sakhalin': 'RU',
  'Asia/Srednekolymsk': 'RU',
  'Asia/Kamchatka': 'RU',
  'Asia/Anadyr': 'RU',
}

export function countryByTimezone(): string | null {
  try {
    return TIMEZONE_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null
  } catch {
    return null
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
