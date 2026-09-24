// Page factory for the localized catalog hubs (/en/villas/canggu,
// /id/vila/canggu/2-bedroom, /de/wohnanlagen/uluwatu …). Each locale's
// `[...slug]/page.tsx` is a three-line wrapper around one of these, so the
// hub logic lives once per section instead of 27 near-identical copies.
// RU keeps its own hand-written /ru/*/[...slug] pages.

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Lang } from './i18n'
import { hubPath, hubSegmentsToRu, hubLanguages, type HubSection } from './hub-routes'
import { SLUG_TO_DISTRICT } from './seo-routes'
import { getBuyHeading, getDistrictCopy } from './districts'

type Params = Promise<{ slug: string[] }>
type MetaOpts = { canonicalPath: string; noIndex: boolean; totalCount?: number }

export type HubConfig<F> = {
  section: HubSection
  kind: 'villa' | 'apartment' | 'complex'
  stripPagination: (segs: string[]) => { segments: string[]; page: number } | null
  parseCleanPath: (segs: string[]) => F | null
  buildCanonicalPath: (f: F) => string | null
  loadCatalogPage: (f: F, page: number, lang: Lang) => Promise<{ totalCount: number; totalPages: number }>
  buildMetadata: (f: F, lang: Lang, opts: MetaOpts) => Metadata
  Catalog: (props: { filters: F; page: number; basePath: string; lang: Lang }) => Promise<React.ReactElement>
}

const PAGE_WORD: Record<Lang, (n: number) => string> = {
  ru: n => `страница ${n}`, en: n => `page ${n}`, id: n => `halaman ${n}`,
  fr: n => `page ${n}`, de: n => `Seite ${n}`, zh: n => `第${n}页`,
  nl: n => `pagina ${n}`, ban: n => `kaca ${n}`, pl: n => `strona ${n}`, uk: n => `сторінка ${n}`,
}

function decodeSeg(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

export function makeHubPage<F>(cfg: HubConfig<F>, lang: Lang) {
  const root = hubPath(cfg.section, lang) ?? cfg.section

  function resolve(slug: string[]) {
    const stripped = cfg.stripPagination(slug)
    if (!stripped) return null
    const { segments, page } = stripped
    const filters = cfg.parseCleanPath(hubSegmentsToRu(segments))
    if (!filters) return null
    const ruCanonical = cfg.buildCanonicalPath(filters) ?? cfg.section
    const canonical = hubPath(ruCanonical, lang) ?? root
    return { segments, page, filters, ruCanonical, canonical }
  }

  async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { slug } = await params
    const r = resolve(slug)
    if (!r) return { robots: { index: false, follow: false } }
    const { page, filters, ruCanonical } = r
    const canonical = page === 1 ? r.canonical : `${r.canonical}/page/${page}`
    let totalCount: number | undefined
    try {
      totalCount = (await cfg.loadCatalogPage(filters, page, lang)).totalCount
    } catch {}
    const meta = cfg.buildMetadata(filters, lang, { canonicalPath: canonical, noIndex: false, totalCount })
    if (page === 1) meta.alternates = { canonical, languages: hubLanguages(ruCanonical) }
    // Single-district hubs: RU and EN already get a commercial title from
    // getDistrictCommercialMeta; the other locales only had the descriptive
    // «Vila dan rumah di Canggu». Lead with the native «buy» phrase instead.
    const segs = ruCanonical.slice(cfg.section.length + 1).split('/').filter(Boolean)
    if (lang !== 'en' && lang !== 'ru' && segs.length === 1 && SLUG_TO_DISTRICT[segs[0]]) {
      const name = getDistrictCopy(segs[0], lang)?.name ?? SLUG_TO_DISTRICT[segs[0]]
      meta.title = `${getBuyHeading(cfg.kind, lang, totalCount, name)} | Balinsky`
      if (meta.openGraph) meta.openGraph = { ...meta.openGraph, title: meta.title }
    }
    if (page > 1 && typeof meta.title === 'string') {
      meta.title = meta.title.replace(' | Balinsky', '') + ` — ${PAGE_WORD[lang](page)} | Balinsky`
    }
    return meta
  }

  async function Page({ params }: { params: Params }) {
    const { slug } = await params
    const r = resolve(slug)
    if (!r) notFound()
    const { segments, page, filters, canonical } = r
    // Non-canonical spelling (RU slugs, other segment order, /page/1) → 308.
    const requested = [root, ...segments.map(decodeSeg)].join('/')
    if (page === 1 && (requested !== canonical || segments.length !== slug.length)) {
      permanentRedirect(canonical)
    }
    if (page > 1) {
      const probe = await cfg.loadCatalogPage(filters, page, lang)
      if (page > probe.totalPages) notFound()
    }
    return <cfg.Catalog filters={filters} page={page} basePath={canonical} lang={lang} />
  }

  return { generateMetadata, Page }
}
