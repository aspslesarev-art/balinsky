import type { HubConfig } from '@/lib/hub-page'
import type { FilterState } from '@/components/filters/FiltersBar'
import { ApartamentyCatalog } from './_catalog'
import { buildMetadataLoc, loadCatalogPage } from './_lib'
import { parseCleanPath, stripPagination, buildCanonicalPath } from '@/lib/seo-routes'

// Apartment hubs in the non-RU locales — see lib/hub-page.tsx.
export const apartmentHub: HubConfig<FilterState> = {
  section: '/ru/apartamenty',
  kind: 'apartment',
  stripPagination, parseCleanPath, buildCanonicalPath,
  loadCatalogPage: (f, page, lang) => loadCatalogPage(f, page, lang),
  buildMetadata: (f, lang, opts) => buildMetadataLoc(f, lang, opts),
  Catalog: ApartamentyCatalog,
}
