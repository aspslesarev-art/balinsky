'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

// Catalog roots (/ru/villy, /en/apartments …) are ISR pages; middleware
// rewrites a URL with filters to the dynamic <root>/q twin. The client router
// doesn't know about that rewrite: it keeps the static root in its cache and,
// on a soft navigation to <root>?q=…, renders that cached unfiltered copy —
// the URL changes, the list doesn't. A refresh right after the navigation
// refetches the new URL from the server, which then goes through the rewrite.
export function useCatalogRouter() {
  const router = useRouter()
  return useMemo(() => {
    const go = (method: 'push' | 'replace') => (href: string, opts?: { scroll?: boolean }) => {
      router[method](href, opts)
      if (/\?./.test(href)) router.refresh()
    }
    return { push: go('push'), replace: go('replace') }
  }, [router])
}
