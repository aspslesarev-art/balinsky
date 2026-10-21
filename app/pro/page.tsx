import type { Metadata } from 'next'
import { getSiteUser, safeNextPath } from '@/lib/site-auth'
import { detectLang, langToSegment, localizeSegment, segmentToLang } from '@/lib/i18n'
import { ProSignIn } from '@/components/pro/ProSignIn'

// Вход в Balinsky Pro: окно поверх размытой панели аналитики, как у AirDNA
// (владелец 21.10.2026). Pro = любой вошедший: аналитика на страницах вилл
// и апартаментов открывается по куке bx_auth (.bx-auth-block в globals.css).
// Язык окна — язык страницы, откуда пришли (?next), иначе английский.

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Balinsky Pro',
  robots: { index: false, follow: false },
}

export default async function ProPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams
  const next = safeNextPath(rawNext)
  const head = next?.split('/').filter(Boolean)[0]
  const lang = head && segmentToLang(head) ? detectLang(next!) : 'en'
  const user = await getSiteUser()
  return (
    <ProSignIn
      lang={lang}
      next={next}
      browseHref={`/${langToSegment(lang)}/${localizeSegment('villy', lang)}`}
      error={error === 'google' ? 'google' : null}
      user={user ? { name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null } : null}
    />
  )
}
