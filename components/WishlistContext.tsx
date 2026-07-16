'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { WISHLIST_LS_KEY, WISHLIST_MAX, CAPPED_KINDS, type WishlistItem, type WishlistKind } from '@/lib/wishlist'
import type { Lang } from '@/lib/i18n'

type Ctx = {
  items: WishlistItem[]
  ready: boolean
  has: (kind: WishlistKind, slug: string) => boolean
  add: (item: WishlistItem) => void
  remove: (kind: WishlistKind, slug: string) => void
  toggle: (item: WishlistItem) => void
  clear: () => void
}

const WishlistContext = createContext<Ctx | null>(null)
const EMPTY: WishlistItem[] = []

// Cap eviction. The cap of `WISHLIST_MAX` applies *only* to capped
// kinds (villas + apartments). Complexes and rentals are kept as-is
// regardless of count. When a capped item is added that pushes the
// capped subset past the limit, evict the oldest capped item by
// `savedAt` so the new add survives. `incomingKind` short-circuits
// the work when an uncapped item was added.
function applyCap(list: WishlistItem[], incomingKind: WishlistKind): WishlistItem[] {
  if (!CAPPED_KINDS.has(incomingKind)) return list
  const capped = list.filter(i => CAPPED_KINDS.has(i.kind))
  if (capped.length <= WISHLIST_MAX) return list
  const keep = new Set(
    capped
      .slice()
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      .slice(0, WISHLIST_MAX)
      .map(i => `${i.kind}:${i.slug}`),
  )
  return list.filter(i => !CAPPED_KINDS.has(i.kind) || keep.has(`${i.kind}:${i.slug}`))
}

function readSnapshot(): WishlistItem[] {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(WISHLIST_LS_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return EMPTY
    return parsed.filter((x): x is WishlistItem =>
      !!x && typeof x === 'object' && 'kind' in x && 'slug' in x,
    )
  } catch {
    return EMPTY
  }
}

// useSyncExternalStore demands referential stability on equal data, so we
// memoise the parsed array and re-read only when localStorage actually
// changes. Subscribers (useSyncExternalStore + the storage event) bump
// the version; getSnapshot returns the cached array so React skips the
// re-render when nothing changed.
let cachedRaw: string | null = null
let cachedItems: WishlistItem[] = EMPTY
function getSnapshot(): WishlistItem[] {
  if (typeof window === 'undefined') return EMPTY
  const raw = localStorage.getItem(WISHLIST_LS_KEY)
  if (raw === cachedRaw) return cachedItems
  cachedRaw = raw
  cachedItems = readSnapshot()
  return cachedItems
}
function getServerSnapshot(): WishlistItem[] { return EMPTY }

const listeners = new Set<() => void>()
function emit(): void { for (const l of listeners) l() }
function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => { if (e.key === WISHLIST_LS_KEY) cb() }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

function write(items: WishlistItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WISHLIST_LS_KEY, JSON.stringify(items))
    // localStorage doesn't emit `storage` to the same window — bump our
    // own listeners so this tab's subscribers refresh too.
    emit()
  } catch { /* quota / private mode — ignore */ }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // After mount we have a real snapshot from localStorage. Before mount
  // (SSR) items === EMPTY by getServerSnapshot. We expose `ready` so the
  // heart button doesn't render its filled state during the initial paint
  // and trigger hydration mismatches.
  const ready = typeof window !== 'undefined'

  const has = useCallback(
    (kind: WishlistKind, slug: string) => items.some(i => i.kind === kind && i.slug === slug),
    [items],
  )

  // Fire-and-forget tracking ping on every add. We track adds only —
  // removes are signal-poor for "what do users like". Failures are
  // swallowed; analytics never blocks the heart-tap.
  const trackAdd = (item: WishlistItem) => {
    const lang: Lang = typeof window !== 'undefined' && /^\/en(\/|$)/.test(window.location.pathname) ? 'en' : 'ru'
    fetch('/api/track/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: item.kind,
        airtableId: item.airtableId ?? null,
        slug: item.slug,
        title: item.title,
        district: item.district,
        bedrooms: item.bedrooms,
        area: item.area ?? null,
        priceUsd: item.priceUsd,
        lang,
      }),
      keepalive: true,
    }).catch(() => {})
  }

  const add = useCallback((item: WishlistItem) => {
    const prev = readSnapshot()
    if (prev.some(i => i.kind === item.kind && i.slug === item.slug)) return
    write(applyCap([item, ...prev], item.kind))
    trackAdd(item)
  }, [])

  const remove = useCallback((kind: WishlistKind, slug: string) => {
    const prev = readSnapshot()
    const next = prev.filter(i => !(i.kind === kind && i.slug === slug))
    if (next.length === prev.length) return
    write(next)
  }, [])

  const toggle = useCallback((item: WishlistItem) => {
    const prev = readSnapshot()
    const exists = prev.some(i => i.kind === item.kind && i.slug === item.slug)
    const next = exists
      ? prev.filter(i => !(i.kind === item.kind && i.slug === item.slug))
      : applyCap([item, ...prev], item.kind)
    write(next)
    if (!exists) trackAdd(item)
  }, [])

  const clear = useCallback(() => { write([]) }, [])

  const value = useMemo<Ctx>(() => ({ items, ready, has, add, remove, toggle, clear }),
    [items, ready, has, add, remove, toggle, clear])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): Ctx {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    return {
      items: EMPTY,
      ready: false,
      has: () => false,
      add: () => undefined,
      remove: () => undefined,
      toggle: () => undefined,
      clear: () => undefined,
    }
  }
  return ctx
}
