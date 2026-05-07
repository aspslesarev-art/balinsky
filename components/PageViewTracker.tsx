'use client'

import { useEffect } from 'react'

// One row in `page_views` per detail-page mount. Drop into any
// _detail.tsx with the matching kind + slug. Title piped through so
// the admin sees the human name without joining back to raw_*.
//
// Debounce: a sessionStorage key per (kind, slug) prevents:
//   - React Strict Mode double-mount in dev from firing twice.
//   - Quick back-and-forward navigation re-counting the same visit
//     within seconds.
//
// A genuine refresh or new tab still counts because sessionStorage
// is per-tab. Cross-tab dedup would need cookies and feels like
// over-engineering for the question being answered ("how many views
// did this listing get").

type Kind =
  | 'villa' | 'apartment' | 'complex' | 'developer'
  | 'event' | 'promo' | 'news' | 'knowledge' | 'rental'

export function PageViewTracker({
  kind, slug, title, airtableId, lang,
}: {
  kind: Kind
  slug: string
  title?: string | null
  airtableId?: string | null
  lang?: 'ru' | 'en'
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const dedupeKey = `pv:${kind}:${slug}`
    try {
      if (sessionStorage.getItem(dedupeKey)) return
      sessionStorage.setItem(dedupeKey, '1')
    } catch { /* private mode etc — fall through and still ping */ }
    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, slug, title: title ?? null, airtableId: airtableId ?? null, lang: lang ?? 'ru' }),
      keepalive: true,
    }).catch(() => {})
  }, [kind, slug, title, airtableId, lang])
  return null
}
