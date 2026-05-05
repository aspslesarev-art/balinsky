// Visitor-side shortlist persisted in localStorage. The site has no auth,
// so the only "save for later" channel we have is the browser. We keep
// per-item snapshots (title, photo, price snapshot in USD) instead of
// re-fetching on the shortlist page — the manifest endpoints are big
// JSON blobs, and a 30-item shortlist of cached snapshots reads in <1ms.

export type WishlistKind = 'villa' | 'apartment' | 'complex' | 'rental'

export type WishlistItem = {
  kind: WishlistKind
  slug: string
  title: string
  photo: string | null
  // Stored in USD so currency switching on the shortlist page works the
  // same way it does on every other page.
  priceUsd: number | null
  district: string | null
  bedrooms: number | null
  savedAt: string
}

export const WISHLIST_LS_KEY = 'balinsky.shortlist'
export const WISHLIST_MAX = 80
