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
  // Comparison-table fields. Optional because not every kind has every
  // value — apartments have no land area, complexes are rarely a single
  // bedroom count, etc. We fill what we have at save time and the
  // compare view leaves the cell empty otherwise.
  area?: number | null
  land?: number | null
  floor?: string | null
  completionYear?: string | null
  dealType?: 'resale' | 'secondary' | 'primary' | null
  // Investor-focused snapshot fields. Each comes from a single
  // Airtable column on the detail-page side; rendered as their own row
  // in the compare table.
  pricePerSqmUsd?: number | null
  // Annual revenue per square metre as filled in Airtable
  // (Цена м² в год). Lets the comparison surface "earnings per sqm
  // per year" alongside the asking price per sqm.
  pricePerSqmYearUsd?: number | null
  leaseYears?: number | null
  permit?: string | null
  status?: string | null
  claimedYieldPct?: number | null
  landUse?: string | null
  // Developer track record at save time. `developerName` shows on the
  // comparison row; `developerCompletedCount` / `developerInProgressCount`
  // render as a "✓ N · ▲ M" badge — quickly tells the foreign buyer
  // whether they're saving a project from a builder with a delivery
  // history or a one-off.
  developerName?: string | null
  developerCompletedCount?: number | null
  developerInProgressCount?: number | null
  // Construction readiness for complexes: 0–100 percentage based on
  // build stages. Null for villas / apartments / rentals.
  readinessPct?: number | null
  // Best-case ROI as cap rate (0..1) under our optimistic scenario —
  // p75 ADR from booked Booking comps × good occupancy. Captured at
  // save time so the shortlist doesn't need to re-run the calculator.
  // Villa-only at the moment (apartments use developer-claimed yield).
  bestCapRate?: number | null
  // Interior style label from gpt-4o-mini photo classifier. Villa-only.
  interiorStyle?: string | null
  savedAt: string
}

export const WISHLIST_LS_KEY = 'balinsky.shortlist'
export const WISHLIST_MAX = 80
