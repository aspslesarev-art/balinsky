import { notFound, permanentRedirect } from 'next/navigation'
import { ApartamentyCatalog } from '../../../ru/apartamenty/_catalog'
import { buildMetadataEn, loadCatalogPage } from '../../../ru/apartamenty/_lib'
import {
  parseCleanPath,
  stripPagination,
  buildCanonicalPath,
} from '@/lib/seo-routes'
import { enSegmentsToRu, ruHubToEn, hubLanguages } from '@/lib/en-hub-routes'

// English mirror of /ru/apartamenty/[...slug] — /en/apartments/canggu/2-bedroom etc.
// Segments are mapped to the RU slugs so the same parser/canonicaliser
// decides what is a hub; see lib/en-hub-routes.ts.

type Params = Promise<{ slug: string[] }>

export const revalidate = 86400
export function generateStaticParams() { return [] }

function resolve(slug: string[]) {
  const stripped = stripPagination(slug)
  if (!stripped) return null
  const { segments, page } = stripped
  const filters = parseCleanPath(enSegmentsToRu(segments))
  if (!filters) return null
  const ruCanonical = buildCanonicalPath(filters) ?? '/ru/apartamenty'
  const enCanonical = ruHubToEn(ruCanonical) ?? '/en/apartments'
  return { segments, page, filters, ruCanonical, enCanonical }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const r = resolve(slug)
  if (!r) return { robots: { index: false, follow: false } }
  const { page, filters, ruCanonical, enCanonical } = r
  const canonical = page === 1 ? enCanonical : `${enCanonical}/page/${page}`
  let totalCount: number | undefined
  try {
    const probe = await loadCatalogPage(filters, page, 'en')
    totalCount = probe.totalCount
  } catch {}
  const meta = buildMetadataEn(filters, { canonicalPath: canonical, noIndex: false, totalCount })
  if (page === 1) meta.alternates = { canonical, languages: hubLanguages(ruCanonical) }
  if (page > 1) {
    const baseTitle = typeof meta.title === 'string' ? meta.title : 'Apartments | Balinsky'
    meta.title = baseTitle.replace(' | Balinsky', '') + ` — page ${page} | Balinsky`
  }
  return meta
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const r = resolve(slug)
  if (!r) notFound()
  const { segments, page, filters, enCanonical } = r

  // Non-canonical spelling (RU slugs, other segment order, /page/1) → 308.
  const requested = '/en/apartments/' + segments.map(s => decodeURIComponent(s)).join('/')
  if (page === 1 && (requested !== enCanonical || segments.length !== slug.length)) {
    permanentRedirect(enCanonical)
  }
  if (page > 1) {
    const probe = await loadCatalogPage(filters, page, 'en')
    if (page > probe.totalPages) notFound()
  }

  return <ApartamentyCatalog filters={filters} page={page} basePath={enCanonical} lang="en" />
}
