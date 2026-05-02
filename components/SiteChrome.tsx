'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'
import { ConsultantWidget } from './ConsultantWidget'

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
