// Schema.org JSON-LD builders. Structured data is what AI answer engines
// (ChatGPT/Bing, Perplexity, Gemini) and Google rich results read to trust and
// cite a page. Organization + WebSite go site-wide (root layout); FAQPage,
// Article, Dataset and BreadcrumbList are added per page. Render the output
// through <JsonLd> (components/JsonLd.tsx), which escapes it safely.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const ORG_ID = `${SITE}/#organization`
const WEBSITE_ID = `${SITE}/#website`

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Balinsky',
    url: SITE,
    logo: `${SITE}/icon-512.png`,
    image: `${SITE}/icon-512.png`,
    description:
      'Независимый маркетплейс недвижимости на Бали: виллы, апартаменты и жилые комплексы от десятков застройщиков с проверенными документами (PBG, SLF) и аналитикой доходности по реальным данным аренды соседей.',
    email: 'info@balinsky.info',
    areaServed: { '@type': 'Place', name: 'Bali, Indonesia' },
    sameAs: ['https://t.me/BalinskyBot'],
  }
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE,
    name: 'Balinsky',
    inLanguage: ['ru', 'en'],
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/ru/villy?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export type QA = { q: string; a: string }

export function faqPageLd(items: QA[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url.startsWith('http') ? it.url : `${SITE}${it.url}`,
    })),
  }
}

export function articleLd(opts: {
  url: string
  headline: string
  description?: string
  datePublished?: string
  dateModified?: string
  inLanguage?: string
  image?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: opts.url.startsWith('http') ? opts.url : `${SITE}${opts.url}`,
    headline: opts.headline,
    description: opts.description,
    inLanguage: opts.inLanguage ?? 'ru',
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    image: opts.image ?? `${SITE}/icon-512.png`,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
  }
}

// For the auto-generated /answers data pages: a Dataset node makes the live
// market numbers explicitly machine-readable (Perplexity/Google love this).
export function datasetLd(opts: {
  url: string
  name: string
  description: string
  dateModified: string
  inLanguage?: string
  keywords?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${opts.url.startsWith('http') ? opts.url : `${SITE}${opts.url}`}#dataset`,
    name: opts.name,
    description: opts.description,
    url: opts.url.startsWith('http') ? opts.url : `${SITE}${opts.url}`,
    inLanguage: opts.inLanguage ?? 'ru',
    dateModified: opts.dateModified,
    keywords: opts.keywords,
    creator: { '@id': ORG_ID },
    isAccessibleForFree: true,
  }
}
