import { notFound, permanentRedirect } from 'next/navigation'
import { decodeSeg, isDetailPath } from '@/lib/hub-page'
import { ComplexDetail, generateComplexMetadata } from '../o/[slug]/_detail'
import { ComplexesCatalog } from '../_catalog'
import { buildMetadata, loadCatalogPage } from '../_lib'
import {
  parseCleanPath,
  stripPagination,
  buildCanonicalPath,
} from '@/lib/complex-seo-routes'
import { hubLanguages } from '@/lib/hub-routes'

type Params = Promise<{ slug: string[] }>

export const revalidate = 604800
export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  // Адрес объекта при сбое маршрутов локального next dev — см. isDetailPath.
  if (isDetailPath(slug)) return generateComplexMetadata(decodeSeg(slug[1]), 'ru')
  const stripped = stripPagination(slug)
  if (!stripped) return { robots: { index: false, follow: false } }
  const { segments, page } = stripped
  const filters = parseCleanPath(segments)
  if (!filters) return { robots: { index: false, follow: false } }

  const baseCanonical = buildCanonicalPath(filters) ?? '/ru/zhilye-kompleksy'
  const canonical = page === 1 ? baseCanonical : `${baseCanonical}/page/${page}`
  let totalCount: number | undefined
  try {
    const probe = await loadCatalogPage(filters, page)
    totalCount = probe.totalCount
  } catch {}
  const meta = buildMetadata(filters, { canonicalPath: canonical, noIndex: false, totalCount })
  // Reciprocal hreflang with the localized hubs (/en/complexes/…, /id/kompleks/…).
  if (page === 1) meta.alternates = { canonical, languages: hubLanguages(baseCanonical) }
  if (page > 1) {
    const baseTitle = typeof meta.title === 'string' ? meta.title : 'Жилые комплексы | Balinsky'
    meta.title = baseTitle.replace(' | Balinsky', '') + ` — страница ${page} | Balinsky`
  }
  return meta
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  if (isDetailPath(slug)) return <ComplexDetail slug={decodeSeg(slug[1])} lang="ru" />
  const stripped = stripPagination(slug)
  if (!stripped) notFound()
  const { segments, page } = stripped
  const filters = parseCleanPath(segments)
  if (!filters) notFound()

  const baseCanonical = buildCanonicalPath(filters) ?? '/ru/zhilye-kompleksy'
  if (page === 1 && segments.length !== slug.length) {
    permanentRedirect(baseCanonical)
  }
  if (page > 1) {
    const probe = await loadCatalogPage(filters, page)
    if (page > probe.totalPages) notFound()
  }

  return <ComplexesCatalog filters={filters} page={page} basePath={baseCanonical} />
}
