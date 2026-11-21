'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

// Catalog roots (/ru/villy, /en/apartments …) are ISR pages; middleware
// rewrites a URL with filters to the dynamic <root>/q twin. The client router
// doesn't know about that rewrite: it keeps the static root in its cache and,
// on a soft navigation to <root>?q=…, renders that cached unfiltered copy —
// the URL changes, the list doesn't. A refresh after the navigation
// refetches the new URL from the server, which then goes through the rewrite.
//
// The refresh must wait until the new URL is committed. Called right after
// push() it took over the pending navigation and *replaced* the history entry:
// «Назад» after a filter, sort or «Показать N здесь» skipped the catalog and
// left the site section (21.11.2026).
function refreshWhenAt(router: ReturnType<typeof useRouter>, href: string) {
  const target = new URL(href, window.location.href)
  const want = target.pathname + target.search
  const started = Date.now()
  const tick = () => {
    if (window.location.pathname + window.location.search === want) { router.refresh(); return }
    if (Date.now() - started < 10_000) setTimeout(tick, 50)
  }
  setTimeout(tick, 0)
}

export function useCatalogRouter() {
  const router = useRouter()
  return useMemo(() => {
    const go = (method: 'push' | 'replace') => (href: string, opts?: { scroll?: boolean }) => {
      router[method](href, opts)
      if (/\?./.test(href)) refreshWhenAt(router, href)
    }
    return { push: go('push'), replace: go('replace') }
  }, [router])
}
