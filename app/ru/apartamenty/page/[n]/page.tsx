import { notFound, permanentRedirect } from 'next/navigation'
import { ApartamentyCatalog } from '../../_catalog'
import { parseQueryFilters, buildMetadata, hasAnyFilter, loadCatalogPage } from '../../_lib'
import { buildCanonicalPath } from '@/lib/seo-routes'

type Params = Promise<{ n: string }>
type SP = Promise<Record<string, string | undefined>>

function parsePage(raw: string): number | null {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SP }) {
  const [{ n: rawN }, sp] = await Promise.all([params, searchParams])
  const page = parsePage(rawN)
  if (page == null) return { robots: { index: false, follow: false } }
  const f = parseQueryFilters(sp)
  // Page 1 should be served at the base URL — page=1 here is a duplicate, mark
  // canonical to base.
  const canonical = page === 1
    ? '/ru/apartamenty'
    : `/ru/apartamenty/page/${page}`
  const meta = buildMetadata(f, {
    canonicalPath: canonical,
    noIndex: hasAnyFilter(f) && !buildCanonicalPath(f),
  })
  if (page > 1) {
    const baseTitle =
      typeof meta.title === 'string' ? meta.title : 'Апартаменты | Balinsky'
    meta.title = baseTitle.replace(' | Balinsky', '') + ` — страница ${page} | Balinsky`
  }
  return meta
}

export default async function Page({ params, searchParams }: { params: Params; searchParams: SP }) {
  const [{ n: rawN }, sp] = await Promise.all([params, searchParams])
  const page = parsePage(rawN)
  if (page == null) notFound()

  // Page 1 belongs at the base URL — redirect to canonical.
  if (page === 1) {
    const qs = new URLSearchParams(
      Object.entries(sp).filter(([, v]) => typeof v === 'string') as [string, string][]
    ).toString()
    permanentRedirect(qs ? `/ru/apartamenty?${qs}` : '/ru/apartamenty')
  }

  const filters = parseQueryFilters(sp)

  // 404 if requested page exceeds total pages
  const probe = await loadCatalogPage(filters, page)
  if (page > probe.totalPages) notFound()

  return <ApartamentyCatalog filters={filters} page={page} basePath="/ru/apartamenty" />
}
