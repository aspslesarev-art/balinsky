// Подписи для подборок: склонения и «когда» по-русски.

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export const objectsRu = (n: number) => `${n} ${plural(n, 'объект', 'объекта', 'объектов')}`
export const timesRu = (n: number) => `${n} ${plural(n, 'раз', 'раза', 'раз')}`

const TZ = 'Asia/Makassar'
const DAY = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: TZ })
const TIME = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const YMD = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })

/** «сегодня, 14:20» / «вчера, 22:05» / «26 окт., 11:40» — по времени Бали. */
export function whenRu(iso: string, withTime = true): string {
  const d = new Date(iso)
  const day = YMD.format(d)
  const today = YMD.format(new Date())
  const yesterday = YMD.format(new Date(Date.now() - 86400_000))
  const label = day === today ? 'сегодня' : day === yesterday ? 'вчера' : DAY.format(d).replace('.', '')
  return withTime ? `${label}, ${TIME.format(d)}` : label
}

/** Сколько клиент пробыл: «меньше минуты», «9 мин», «1 ч 5 мин». */
export function durationRu(fromIso: string, toIso: string): string {
  const min = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000)
  if (min < 1) return 'меньше минуты'
  if (min < 60) return `${min} мин`
  return `${Math.floor(min / 60)} ч ${min % 60} мин`
}

/** Ссылка для клиента; в браузере — от текущего адреса (локальная копия тоже). */
export function collectionUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://balinsky.info'
  return `${origin}/p/${token}`
}
