'use client'

import dynamic from 'next/dynamic'
import { detectLang } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { Footer } from './Footer'
import type { Lang } from '@/lib/i18n'

// ConsultantWidget pulls react-markdown + the bot UI; it's only needed if
// the visitor opens the chat. Lazy-loaded so the initial page bundle stays
// small and the widget chunk fetches in the background after first paint.
const ConsultantWidget = dynamic(
  () => import('./ConsultantWidget').then(m => ({ default: m.ConsultantWidget })),
  { ssr: false, loading: () => null },
)

// On-page editing overlay. Renders null for everyone except a logged-in admin,
// so the only cost for a normal visitor is one tiny /api/admin/whoami check.
const InlineEditor = dynamic(
  () => import('./InlineEditor').then(m => ({ default: m.InlineEditor })),
  { ssr: false, loading: () => null },
)

export function SiteChrome() {
  const pathname = usePathname() ?? ''
  // Admin is its own self-contained UI: no public footer, no AI consultant.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null
  // Telegram Mini App pages are rendered inside the Telegram WebView — they
  // don't want a site footer or AI chat bubble.
  if (pathname === '/bot' || pathname.startsWith('/bot/')) return null
  // Выездной лендинг /phuket — самостоятельная посадочная страница для
  // агентств Пхукета: без футера маркетплейса и без AI-консультанта,
  // чтобы единственным действием осталась бронь встречи.
  if (pathname === '/phuket') return null
  const lang: Lang = detectLang(pathname)
  return (
    <>
      <Footer lang={lang} />
      <ConsultantWidget />
      <InlineEditor />
    </>
  )
}
