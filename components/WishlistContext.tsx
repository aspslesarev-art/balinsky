'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { WISHLIST_LS_KEY, WISHLIST_MAX, type WishlistItem, type WishlistKind } from '@/lib/wishlist'

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

  const add = useCallback((item: WishlistItem) => {
    const prev = readSnapshot()
    if (prev.some(i => i.kind === item.kind && i.slug === item.slug)) return
    const next = [item, ...prev]
    if (next.length > WISHLIST_MAX) {
      next.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      next.length = WISHLIST_MAX
    }
    write(next)
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
      : [item, ...prev]
    if (!exists && next.length > WISHLIST_MAX) {
      next.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      next.length = WISHLIST_MAX
    }
    write(next)
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
