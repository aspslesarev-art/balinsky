'use client'

import dynamic from 'next/dynamic'
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

// Server passes `isClosedPortal=true` for presentation.estate / admin
// so we render nothing there. Path-check below is a belt-and-
// suspenders fallback (e.g. someone navigates client-side).
export function SiteChrome({ isClosedPortal = false }: { isClosedPortal?: boolean }) {
  const pathname = usePathname() ?? ''
  if (isClosedPortal) return null
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null
  if (pathname.startsWith('/presentation/') || pathname === '/presentation') return null

  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  return (
    <>
      <Footer lang={lang} />
      <ConsultantWidget />
    </>
  )
}
