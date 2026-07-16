'use client'

import { useEffect } from 'react'
import type { Lang } from '@/lib/i18n'

// One row in `page_views` per detail-page mount. Drop into any
// _detail.tsx with the matching kind + slug. Title piped through so
// the admin sees the human name without joining back to raw_*.
//
// Two side effects on each mount:
//   1. POST to /api/track/view — feeds /admin/views analytics.
//   2. Push entry into localStorage `balina.recentlyViewed` (last 20)
//      so the consultant widget can read it as conversation context
//      ("ты вчера смотрел Origins и Allex, давай сравним?").
//
// Debounce: a sessionStorage key per (kind, slug) prevents Strict-
// Mode double-mount and quick back/forward from inflating either
// the server count or the client recent list.

type Kind =
  | 'villa' | 'apartment' | 'complex' | 'developer'
  | 'event' | 'promo' | 'news' | 'knowledge' | 'rental'

export const RECENT_KEY = 'balina.recentlyViewed'
const RECENT_CAP = 20

export type RecentlyViewedEntry = {
  kind: Kind
  slug: string
  title: string | null
  airtableId: string | null
  at: string  // ISO
}

export function PageViewTracker({
  kind, slug, title, airtableId, lang,
}: {
  kind: Kind
  slug: string
  title?: string | null
  airtableId?: string | null
  lang?: Lang
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const dedupeKey = `pv:${kind}:${slug}`
    try {
      if (sessionStorage.getItem(dedupeKey)) return
      sessionStorage.setItem(dedupeKey, '1')
    } catch { /* private mode etc — fall through and still ping */ }

    // Server analytics fire-and-forget.
    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, slug, title: title ?? null, airtableId: airtableId ?? null, lang: lang ?? 'ru' }),
      keepalive: true,
    }).catch(() => {})

    // Local recently-viewed for Балина's context.
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      const list: RecentlyViewedEntry[] = raw ? JSON.parse(raw) : []
      // Drop any prior entry for this same listing; we want it
      // freshly at the top with a current timestamp.
      const filtered = list.filter(e => !(e.kind === kind && e.slug === slug))
      const next: RecentlyViewedEntry[] = [
        { kind, slug, title: title ?? null, airtableId: airtableId ?? null, at: new Date().toISOString() },
        ...filtered,
      ].slice(0, RECENT_CAP)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch { /* private mode / quota — fine */ }
  }, [kind, slug, title, airtableId, lang])
  return null
}
