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
      {/* min-w-0 on <ol> + max-w-full + truncate on the LAST item is
          the fix for long-title detail pages. Without it, an
          inline-flex <li> wrapping a 60-char SEO title takes its
          natural min-content width (~450 px at 13 px), pushing the
          row past the mobile viewport even though `flex-wrap` did
          its job by sending the item to a new row. */}
      <nav aria-label="Breadcrumbs" className="mt-4 mb-2 min-w-0">
        <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[13px] text-[var(--color-text-muted)] min-w-0">
          {items.map((c, i) => {
            const last = i === items.length - 1
            return (
              <li key={i} className={`inline-flex items-center gap-1.5 ${last ? 'min-w-0 max-w-full' : ''}`}>
                {c.href && !last ? (
                  <Link href={c.href} className="hover:text-[var(--color-primary-pressed)] no-underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className={`${last ? 'text-[var(--color-text)] truncate min-w-0' : ''}`}>{c.label}</span>
                )}
                {!last && <ChevronRight size={12} className="opacity-50" />}
              </li>
            )
          })}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
