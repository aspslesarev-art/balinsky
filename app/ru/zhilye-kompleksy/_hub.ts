import type { HubConfig } from '@/lib/hub-page'
import { ComplexesCatalog } from './_catalog'
import { buildMetadataEn, loadCatalogPage, type ComplexFilterState } from './_lib'
import { parseCleanPath, stripPagination, buildCanonicalPath } from '@/lib/complex-seo-routes'

// Complex hubs in the non-RU locales — see lib/hub-page.tsx.
// buildMetadataEn is the non-RU builder here: it takes the language.
export const complexHub: HubConfig<ComplexFilterState> = {
  section: '/ru/zhilye-kompleksy',
  kind: 'complex',
  stripPagination, parseCleanPath, buildCanonicalPath,
  loadCatalogPage: (f, page, lang) => loadCatalogPage(f, page, lang),
  buildMetadata: (f, lang, opts) => buildMetadataEn(f, opts, lang),
  Catalog: ComplexesCatalog,
}
