import { notFound, permanentRedirect } from 'next/navigation'
import { ApartamentyCatalog } from '../_catalog'
import { buildMetadata, loadCatalogPage } from '../_lib'
import {
  parseCleanPath,
  stripPagination,
  buildCanonicalPath,
} from '@/lib/seo-routes'

type Params = Promise<{ slug: string[] }>

// ISR: revalidate static HTML every hour. Canonical SEO landing pages (e.g.
// /ru/apartamenty/pandawa/2-spalni) are now served from Vercel CDN for any
// cold visitor — TTFB ~50ms instead of 5–10s.
export const revalidate = 3600
export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const stripped = stripPagination(slug)
  if (!stripped) return { robots: { index: false, follow: false } }
  const { segments, page } = stripped
  const filters = parseCleanPath(segments)
  if (!filters) return { robots: { index: false, follow: false } }

  const baseCanonical = buildCanonicalPath(filters) ?? '/ru/apartamenty'
  const canonical = page === 1 ? baseCanonical : `${baseCanonical}/page/${page}`
  let totalCount: number | undefined
  try {
    const probe = await loadCatalogPage(filters, page)
    totalCount = probe.totalCount
  } catch {}
  const meta = buildMetadata(filters, { canonicalPath: canonical, noIndex: false, totalCount })
  if (page > 1) {
    const baseTitle =
      typeof meta.title === 'string' ? meta.title : 'Апартаменты | Balinsky'
    meta.title = baseTitle.replace(' | Balinsky', '') + ` — страница ${page} | Balinsky`
  }
  return meta
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const stripped = stripPagination(slug)
  if (!stripped) notFound()
  const { segments, page } = stripped
  const filters = parseCleanPath(segments)
  if (!filters) notFound()

  const baseCanonical = buildCanonicalPath(filters) ?? '/ru/apartamenty'

  // Page 1 lives at the base canonical URL; redirect to it.
  if (page === 1 && segments.length !== slug.length) {
    permanentRedirect(baseCanonical)
  }

  // 404 if requested page exceeds total pages
  if (page > 1) {
    const probe = await loadCatalogPage(filters, page)
    if (page > probe.totalPages) notFound()
  }

  return <ApartamentyCatalog filters={filters} page={page} basePath={baseCanonical} />
}
