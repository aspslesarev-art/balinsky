// Live stats for category-page meta (TASK-13c): count, price range ($K),
// developer count — computed from each section's existing loader so the
// snippet numbers are always current. Kept loader-agnostic (accepts the
// loader fn) so RU and EN roots share one implementation.
import { createClient } from '@supabase/supabase-js'
import type { CategoryStats } from './seo'
import { isHiddenDeveloper } from './hidden-developers'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type VillaRow = { priceUsd?: number | null; developerName?: string | null }
type AptRow = { priceUsd?: number | null; developerNames?: string[] | null }

// Медиана, а не среднее: в каталоге есть особняки за 6,5 млн $, и среднее они
// утаскивают далеко вверх от того, что покупатель реально видит в каталоге.
// «Сколько стоит вилла на Бали» — второй по величине кластер RU-спроса, и
// отвечать на него надо честной серединой рынка.
function priceRangeK(prices: number[]): {
  minPriceK: number | null
  maxPriceK: number | null
  medPriceK: number | null
} {
  const p = prices.filter(n => typeof n === 'number' && n > 0).sort((a, b) => a - b)
  if (!p.length) return { minPriceK: null, maxPriceK: null, medPriceK: null }
  const mid = Math.floor(p.length / 2)
  const median = p.length % 2 === 0 ? (p[mid - 1] + p[mid]) / 2 : p[mid]
  return {
    minPriceK: Math.round(p[0] / 1000),
    maxPriceK: Math.round(p[p.length - 1] / 1000),
    medPriceK: Math.round(median / 1000),
  }
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

/** Published, non-hidden developer count (mirrors the catalog's filter). */
export async function publishedDeveloperCount(): Promise<CategoryStats> {
  const { data } = await sb
    .from('raw_developers')
    .select('pub:data->Публикация, slug:data->"SEO:Slug", dev:data->Developer')
    .limit(500)
  // Cast via unknown — the typed client can't parse a renamed field whose
  // source key is Cyrillic (Публикация), though it runs fine.
  const rows = (data ?? []) as unknown as { pub: unknown; slug: unknown; dev: unknown }[]
  const count = rows.filter(r => r.pub === true && r.slug && r.dev && !isHiddenDeveloper(String(r.dev))).length
  return { count }
}
