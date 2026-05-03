import Link from 'next/link'
import type { VillaFilterState, VillaFilterOptions } from '@/app/ru/villy/_lib'
import { buildCanonicalPath, STYLE_TO_SLUG } from '@/lib/villa-seo-routes'
import { DISTRICT_TO_SLUG, BEDROOM_TO_SLUG } from '@/lib/seo-routes'

// Internal-link cluster under the catalog: spreads PageRank across
// long-tail filter pages (Google rewards sites that link their own
// indexable pages well). Shown only when there's something useful to
// suggest — never empty rails.
export function RelatedVillaFilters({ filters, options }: {
  filters: VillaFilterState
  options: VillaFilterOptions
}) {
  // Build a candidate filter, ask buildCanonicalPath for the canonical URL.
  // If it's not buildable (out of slug map etc.), the link is dropped.
  type Cand = { label: string; href: string; count?: number }
  function makeLink(patch: Partial<VillaFilterState>, label: string, count?: number): Cand | null {
    const next: VillaFilterState = { ...filters, ...patch }
    const path = buildCanonicalPath(next)
    if (!path) return null
    return { label, href: path, count }
  }

  // 1) Same district — other bedrooms (only if a single district is picked).
  let sameDistrictBedrooms: Cand[] = []
  if (filters.district.length === 1 && filters.bedrooms.length === 0) {
    sameDistrictBedrooms = options.bedrooms
      .filter(b => BEDROOM_TO_SLUG[b.value] && (b.count ?? 0) > 0)
      .slice(0, 6)
      .map(b => makeLink({ bedrooms: [b.value] }, `${b.value} ${labelBR(b.value)} в ${filters.district[0]}`, b.count))
      .filter((x): x is Cand => x !== null)
  }

  // 2) Same bedroom count — other districts (only if a single bedroom is picked).
  let sameBedroomDistricts: Cand[] = []
  if (filters.bedrooms.length === 1 && filters.district.length === 0) {
    sameBedroomDistricts = options.district
      .filter(d => DISTRICT_TO_SLUG[d.value] && (d.count ?? 0) > 0)
      .slice(0, 8)
      .map(d => makeLink({ district: [d.value] }, `${filters.bedrooms[0]} ${labelBR(filters.bedrooms[0])} в ${d.value}`, d.count))
      .filter((x): x is Cand => x !== null)
  }

  // 3) By style in the same district (or globally if no district).
  const styles: Cand[] = options.style
    .filter(s => STYLE_TO_SLUG[s.value] && (s.count ?? 0) > 0)
    .filter(s => !filters.style.includes(s.value))
    .slice(0, 6)
    .map(s => makeLink({ style: [s.value] }, `${s.value}${filters.district.length === 1 ? ` в ${filters.district[0]}` : ''}`, s.count))
    .filter((x): x is Cand => x !== null)

  // 4) Top districts when nothing is filtered yet — entry-level browse cluster.
  let topDistricts: Cand[] = []
  if (filters.district.length === 0 && filters.bedrooms.length === 0 && filters.style.length === 0 && filters.status.length === 0) {
    topDistricts = options.district
      .filter(d => DISTRICT_TO_SLUG[d.value] && (d.count ?? 0) > 0)
      .slice(0, 10)
      .map(d => makeLink({ district: [d.value] }, d.value, d.count))
      .filter((x): x is Cand => x !== null)
  }

  const sections: { title: string; items: Cand[] }[] = [
    { title: 'Сколько спален', items: sameDistrictBedrooms },
    { title: 'В других районах', items: sameBedroomDistricts },
    { title: 'По стилю интерьера', items: styles },
    { title: 'Популярные районы', items: topDistricts },
  ].filter(s => s.items.length > 0)

  if (sections.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-[var(--color-border)]">
      <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-5">Смотрите также</h2>
      <div className="space-y-5">
        {sections.map(sec => (
          <div key={sec.title}>
            <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{sec.title}</div>
            <ul className="flex flex-wrap gap-2">
              {sec.items.map(it => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[13px] text-[#111827] no-underline hover:border-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] transition-colors"
                  >
                    {it.label}
                    {it.count != null && (
                      <span className="text-[11px] text-[var(--color-text-muted)]">· {it.count}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function labelBR(n: string): string {
  // Russian plural for "спальня"
  const x = parseInt(n, 10)
  if (!Number.isFinite(x)) return 'спален'
  const m10 = x % 10, m100 = x % 100
  if (m10 === 1 && m100 !== 11) return 'спальня'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'спальни'
  return 'спален'
}
