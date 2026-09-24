import type { HubConfig } from '@/lib/hub-page'
import { VillasCatalog } from './_catalog'
import { buildMetadataLoc, loadCatalogPage, type VillaFilterState } from './_lib'
import { parseCleanPath, stripPagination, buildCanonicalPath } from '@/lib/villa-seo-routes'

// Villa hubs in the non-RU locales — see lib/hub-page.tsx.
export const villaHub: HubConfig<VillaFilterState> = {
  section: '/ru/villy',
  kind: 'villa',
  stripPagination, parseCleanPath, buildCanonicalPath,
  loadCatalogPage: (f, page, lang) => loadCatalogPage(f, page, lang),
  buildMetadata: (f, lang, opts) => buildMetadataLoc(f, lang, opts),
  Catalog: VillasCatalog,
}
