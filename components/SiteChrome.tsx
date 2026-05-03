'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

// ConsultantWidget pulls react-markdown + the bot UI; it's only needed if
// the visitor opens the chat. Lazy-loaded so the initial page bundle stays
// small and the widget chunk fetches in the background after first paint.
const ConsultantWidget = dynamic(
  () => import('./ConsultantWidget').then(m => ({ default: m.ConsultantWidget })),
  { ssr: false, loading: () => null },
)

export function SiteChrome() {
  const pathname = usePathname() ?? ''
  // Admin is its own self-contained UI: no public footer, no AI consultant.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null
  return (
    <>
      <Footer />
      <ConsultantWidget />
    </>
  )
}
