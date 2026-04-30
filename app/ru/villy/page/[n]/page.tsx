import { notFound, permanentRedirect } from 'next/navigation'
import { VillasCatalog } from '../../_catalog'
import { parseQueryFilters, buildMetadata, hasAnyFilter, loadCatalogPage } from '../../_lib'
import { buildCanonicalPath } from '@/lib/villa-seo-routes'

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
  const canonical = page === 1 ? '/ru/villy' : `/ru/villy/page/${page}`
  const meta = buildMetadata(f, {
    canonicalPath: canonical,
    noIndex: hasAnyFilter(f) && !buildCanonicalPath(f),
  })
  if (page > 1) {
    const baseTitle = typeof meta.title === 'string' ? meta.title : 'Виллы и дома | Balinsky'
    meta.title = baseTitle.replace(' | Balinsky', '') + ` — страница ${page} | Balinsky`
  }
  return meta
}

export default async function Page({ params, searchParams }: { params: Params; searchParams: SP }) {
  const [{ n: rawN }, sp] = await Promise.all([params, searchParams])
  const page = parsePage(rawN)
  if (page == null) notFound()

  if (page === 1) {
    const qs = new URLSearchParams(
      Object.entries(sp).filter(([, v]) => typeof v === 'string') as [string, string][],
    ).toString()
    permanentRedirect(qs ? `/ru/villy?${qs}` : '/ru/villy')
  }

  const filters = parseQueryFilters(sp)
  const probe = await loadCatalogPage(filters, page)
  if (page > probe.totalPages) notFound()

  return <VillasCatalog filters={filters} page={page} basePath="/ru/villy" />
}
