import { notFound, permanentRedirect } from 'next/navigation'
import { VillasCatalog } from '../_catalog'
import { buildMetadata, loadCatalogPage } from '../_lib'
import {
  parseCleanPath,
  stripPagination,
  buildCanonicalPath,
} from '@/lib/villa-seo-routes'

type Params = Promise<{ slug: string[] }>

export const revalidate = 3600
export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const stripped = stripPagination(slug)
  if (!stripped) return { robots: { index: false, follow: false } }
  const { segments, page } = stripped
  const filters = parseCleanPath(segments)
  if (!filters) return { robots: { index: false, follow: false } }

  const baseCanonical = buildCanonicalPath(filters) ?? '/ru/villy'
  const canonical = page === 1 ? baseCanonical : `${baseCanonical}/page/${page}`
  // Need totalCount in title/description for the commercial pattern on
  // single-district hubs («Купить виллу в Нуса Дуа, Бали — 47 вилл 2026»).
  // loadCatalogPage is dedupe-cached by Next, so this doesn't double-fetch.
  let totalCount: number | undefined
  try {
    const probe = await loadCatalogPage(filters, page)
    totalCount = probe.totalCount
  } catch {}
  const meta = buildMetadata(filters, { canonicalPath: canonical, noIndex: false, totalCount })
  if (page > 1) {
    const baseTitle = typeof meta.title === 'string' ? meta.title : 'Виллы и дома | Balinsky'
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

  const baseCanonical = buildCanonicalPath(filters) ?? '/ru/villy'
  if (page === 1 && segments.length !== slug.length) {
    permanentRedirect(baseCanonical)
  }
  if (page > 1) {
    const probe = await loadCatalogPage(filters, page)
    if (page > probe.totalPages) notFound()
  }

  return <VillasCatalog filters={filters} page={page} basePath={baseCanonical} />
}
