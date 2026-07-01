// Live stats for category-page meta (TASK-13c): count, price range ($K),
// developer count — computed from each section's existing loader so the
// snippet numbers are always current. Kept loader-agnostic (accepts the
// loader fn) so RU and EN roots share one implementation.
import type { CategoryStats } from './seo'

type VillaRow = { priceUsd?: number | null; developerName?: string | null }
type AptRow = { priceUsd?: number | null; developerNames?: string[] | null }

function priceRangeK(prices: number[]): { minPriceK: number | null; maxPriceK: number | null } {
  const p = prices.filter(n => typeof n === 'number' && n > 0)
  if (!p.length) return { minPriceK: null, maxPriceK: null }
  return { minPriceK: Math.round(Math.min(...p) / 1000), maxPriceK: Math.round(Math.max(...p) / 1000) }
}

/** Villas: rows carry priceUsd + a single developerName. */
export function villaCategoryStats(rows: VillaRow[]): CategoryStats {
  const devs = new Set(rows.map(r => r.developerName).filter(Boolean) as string[])
  return { count: rows.length, ...priceRangeK(rows.map(r => Number(r.priceUsd)).filter(Number.isFinite)), devCount: devs.size || null }
}

/** Apartments: rows carry priceUsd + developerNames[]. */
export function apartmentCategoryStats(rows: AptRow[]): CategoryStats {
  const devs = new Set<string>()
  for (const r of rows) for (const d of r.developerNames ?? []) if (d) devs.add(d)
  return { count: rows.length, ...priceRangeK(rows.map(r => Number(r.priceUsd)).filter(Number.isFinite)), devCount: devs.size || null }
}
