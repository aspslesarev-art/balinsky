// Учёт кликов по ссылкам в Telegram и WhatsApp в собственной таблице
// contact_clicks (миграция 086, отчёт — /admin/kontakty). Зовётся из
// делегированного слушателя в components/Analytics.tsx, поэтому наши
// собственные браузеры (флаг bx_no_track) в счётчики не попадают, как и
// в GA/Метрику. Отправка через sendBeacon — переход по ссылке не ждёт.
//
// Кнопки менеджеров добавляют о себе data-contact-* (кто, чей застройщик,
// где стоит кнопка) — см. components/ManagerCard.tsx. Остальные ссылки
// пишутся с placement = id ближайшей секции или footer/header.

import { detectLang, localizeSegment } from '@/lib/i18n'

const KIND_BY_SEGMENT: Record<string, string> = {
  villy: 'villa',
  apartamenty: 'apartment',
  'zhilye-kompleksy': 'complex',
  zastrojshhiki: 'developer',
  arenda: 'rental',
}

export function contactChannelOf(href: string): 'telegram' | 'whatsapp' | null {
  if (/^(https?:\/\/)?(t\.me|telegram\.me)\//i.test(href) || /^tg:/i.test(href)) return 'telegram'
  if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href) || /^whatsapp:/i.test(href)) return 'whatsapp'
  return null
}

// /en/villas/o/<slug> → { kind: 'villa', slug }. Только детальные страницы.
function pageOf(pathname: string): { kind: string | null; slug: string | null } {
  const parts = pathname.split('/').filter(Boolean)
  const section = parts[1] ? localizeSegment(parts[1], 'ru') : null
  const kind = section ? KIND_BY_SEGMENT[section] ?? null : null
  if (!kind) return { kind: null, slug: null }
  const slug = parts[2] === 'o' ? parts[3] ?? null : kind === 'developer' ? parts[2] ?? null : null
  return { kind: slug ? kind : null, slug }
}

function visitorId(): string | null {
  try {
    let id = localStorage.getItem('bl_vid')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('bl_vid', id)
    }
    return id
  } catch {
    return null
  }
}

function placementOf(a: HTMLAnchorElement): string | null {
  if (a.dataset.contactPlacement) return a.dataset.contactPlacement
  if (a.closest('footer')) return 'footer'
  if (a.closest('header')) return 'header'
  const section = a.closest('[id]')
  return section?.id || null
}

/** Отправить клик по ссылке мессенджера. Ничего не делает для прочих ссылок. */
export function reportContactClick(a: HTMLAnchorElement): void {
  const href = a.getAttribute('href') ?? ''
  const channel = contactChannelOf(href)
  if (!channel) return
  const path = window.location.pathname
  const { kind, slug } = pageOf(path)
  const payload = {
    channel,
    href,
    placement: placementOf(a),
    path,
    pageKind: kind,
    pageSlug: slug,
    title: document.title,
    managerId: a.dataset.contactManagerId ?? null,
    managerName: a.dataset.contactManager ?? null,
    developerName: a.dataset.contactDeveloper ?? null,
    lang: detectLang(path),
    visitorId: visitorId(),
  }
  try {
    const body = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/track/contact', body)) {
      void fetch('/api/track/contact', { method: 'POST', body, keepalive: true }).catch(() => {})
    }
  } catch { /* учёт не должен ломать переход */ }
}
