// Контакт и дата публикации объявления аренды — для карточки каталога и
// страницы объекта.
//
// Контакт ведёт напрямую к автору объявления: Balinsky не посредник
// (project_balinsky_info_only). Поле `telegram` в манифесте — ник автора
// поста, ссылка wa.me или чат, если пост опубликовала сама группа.

import type { Lang } from './i18n'

export type RentalContact = {
  kind: 'telegram' | 'whatsapp' | 'other'
  href: string
  /** Ник автора (@name), если это личный Telegram, а не группа или бот. */
  handle: string | null
  /** Ссылка ведёт в группу или бота, а не к человеку. */
  viaGroup: boolean
}

export function rentalContact(raw: string | null | undefined): RentalContact | null {
  const v = raw?.trim()
  if (!v) return null
  if (/wa\.me|whatsapp/i.test(v)) return { kind: 'whatsapp', href: v.startsWith('http') ? v : `https://${v}`, handle: null, viaGroup: false }
  const tg = v.match(/^(?:https?:\/\/)?(?:t|telegram)\.me\/([A-Za-z0-9_]{4,})\/?$/i) ?? v.match(/^@([A-Za-z0-9_]{4,})$/)
  if (tg) {
    const name = tg[1]
    // Боты и групповые чаты — это не человек: так выглядят посты, которые
    // группа публикует от своего имени.
    const viaGroup = /bot$/i.test(name) || /group|chat$/i.test(name)
    return { kind: 'telegram', href: `https://t.me/${name}`, handle: viaGroup ? null : `@${name}`, viaGroup }
  }
  if (/^https?:\/\//i.test(v)) return { kind: 'other', href: v, handle: null, viaGroup: false }
  return null
}

const LOCALE: Record<Lang, string> = {
  ru: 'ru-RU', en: 'en-GB', id: 'id-ID', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', nl: 'nl-NL', ban: 'id-ID', pl: 'pl-PL', uk: 'uk-UA',
}

/** «13 октября 2026» на языке страницы; null, если даты нет. */
export function fmtPostedDate(iso: string | null | undefined, lang: Lang, withYear = true): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(LOCALE[lang] ?? 'en-GB', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'Asia/Makassar' })
}

/** Сколько полных дней прошло с публикации. */
export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 864e5))
}
