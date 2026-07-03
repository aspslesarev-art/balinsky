import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const abs = (u: string) => (u.startsWith('http') ? u : `${SITE_URL}${u}`)

// `currentUrl` (path or absolute) is the canonical URL of the page itself —
// used to give the LAST crumb a non-empty `item`, which Google Search Console
// requires on every BreadcrumbList ListItem.
export function Breadcrumbs({ items, currentUrl }: { items: Crumb[]; currentUrl?: string }) {
  // Drop page-less intermediate crumbs (e.g. a regency geo level that has no
  // page): a ListItem without `item` is a GSC "missing field 'item'" error,
  // and an unlinkable middle crumb has no SEO value. Dropped from BOTH the
  // visual list and the JSON-LD so DOM ↔ structured data stay in sync.
  const visible = items.filter((c, i) => c.href || i === items.length - 1)
  if (visible.length === 0) return null

  // Every emitted ListItem carries a non-empty `item`. Non-last crumbs have an
  // href; the last (current page) uses `currentUrl`. If the last crumb has no
  // URL at all, it's omitted from the JSON-LD — Google allows a breadcrumb to
  // end at the parent, which avoids the missing-item error while the visual
  // crumb still shows the page title.
  const jsonItems: { name: string; item: string }[] = []
  visible.forEach((c, i) => {
    const last = i === visible.length - 1
    const url = c.href ? abs(c.href) : last && currentUrl ? abs(currentUrl) : null
    if (url) jsonItems.push({ name: c.label, item: url })
  })

  if (process.env.NODE_ENV !== 'production' && jsonItems.length < visible.length) {
    console.warn(`[Breadcrumbs] last crumb "${visible[visible.length - 1].label}" has no item — pass currentUrl to include it in the BreadcrumbList JSON-LD`)
  }

  const jsonLd = jsonItems.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: jsonItems.map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.name,
          item: it.item,
        })),
      }
    : null

  return (
    <>
      {/* Long detail-page titles (60+ chars) were truncating with an
          ellipsis and stretching the row off-canvas on mobile. The
          fix is to let the last crumb WRAP across multiple lines
          instead of forcing a single line — that's why min-w-0 +
          break-words sit on the <li>/<span>, and the truncate is
          gone. flex-wrap keeps earlier items on their own line. */}
      <nav aria-label="Breadcrumbs" className="mt-4 mb-2 min-w-0">
        <ol className="flex items-start flex-wrap gap-x-1.5 gap-y-1 text-[13px] text-[var(--color-text-muted)] min-w-0">
          {visible.map((c, i) => {
            const last = i === visible.length - 1
            return (
              <li key={i} className={`inline-flex items-start gap-1.5 ${last ? 'min-w-0 basis-full sm:basis-auto max-w-full' : ''}`}>
                {c.href && !last ? (
                  <Link href={c.href} className="hover:text-[var(--color-primary-pressed)] no-underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className={`${last ? 'text-[var(--color-text)] break-words leading-snug' : ''}`}>{c.label}</span>
                )}
                {!last && <ChevronRight size={12} className="opacity-50 mt-[3px]" />}
              </li>
            )
          })}
        </ol>
      </nav>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </>
  )
}
