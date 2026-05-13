import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}),
    })),
  }

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
          {items.map((c, i) => {
            const last = i === items.length - 1
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
