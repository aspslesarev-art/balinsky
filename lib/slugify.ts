// URL slug generation for content records.
//
// Editors create news/events/promo in /admin/data and routinely leave the
// Slug field blank — the record then lands in the manifest without a `slug`,
// the listing renders `<Link href="/ru/novosti/undefined">` and the detail
// page 404s. Slugs are derived here instead, mirroring the transliteration
// the retired Airtable sync used (scripts/legacy-airtable/sync-news.mjs), so
// derived URLs look exactly like the historical ones.
//
// Used on both sides of the write: the admin adapter stamps a slug on save
// (lib/admin/adapters/storage-manifest.ts) and the public loader fills any
// still missing at read time (lib/news.ts), so a slugless record can never
// reach the markup regardless of how it got into the manifest.

import { translit } from '@/lib/translit'

const MAX_SLUG_LEN = 80

/** "Teus Group: Три страны" → "teus-group-tri-strany". Empty when nothing usable remains. */
export function slugifyTitle(title: string | null | undefined): string {
  if (!title) return ''
  return translit(String(title))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LEN)
    .replace(/-+$/, '')
}

/**
 * Disambiguate against slugs already in use, matching the legacy sync's
 * convention: the second "Строительство лифта…" becomes `…-2`.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!base) return ''
  if (!taken.has(base)) return base
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}
