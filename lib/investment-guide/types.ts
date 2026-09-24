// Copy for the «Bali property investment» pillar page (components/InvestmentGuide).
//
// Every figure on this page comes from Balinsky's own data (catalogue +
// short-term rental database, September 2026) or from a cited primary source.
// The data rows live in ./data.ts so all ten locales show the same numbers.

export type Source = { label: string; href: string }

export type InvestmentGuideCopy = {
  meta: { title: string; description: string; ogTitle: string; ogDescription: string }
  crumbHome: string
  crumb: string
  h1: string
  intro: string
  updated: string
  stats: { yield: string; catalogue: string; permits: string; rentals: string }
  why: { h2: string; p1: string; p2: string; p3: string; p3Link: string }
  yields: {
    h2: string
    method: string
    methodLink: string
    colArea: string
    colPrice: string
    colRate: string
    colYield: string
    indicative: string
    browse: string
    areas: { canggu: string; bukit: string; ubud: string; nyanyi: string; nusaDua: string; island: string }
  }
  legal: {
    h2: string
    leaseTitle: string; leaseLead: string; lease: string[]
    pmaTitle: string; pmaLead: string; pma: string[]
    more: string; moreLink: string
  }
  roi: {
    h2: string
    title: string
    lines: string[]
    top: string
    note: string
    noteLink: string
  }
  risks: { h3: string; items: { t: string; d: string }[] }
  check: {
    h2: string
    p: string
    cards: { t: string; d: string }[]
    more: string; moreLink: string
  }
  next: { h2: string; villas: [string, string]; apartments: [string, string]; complexes: [string, string]; howTo: [string, string] }
  faqH2: string
  faq: { q: string; a: string }[]
  sourcesH2: string
  sources: Source[]
  district: {
    metaTitle: (name: string) => string
    metaDescription: (name: string) => string
    h1: (name: string) => string
    caseTitle: (name: string) => string
    rate: (rate: string, n: string) => string
    revenue: (amount: string) => string
    net: (amount: string) => string
    price: (price: string, n: string) => string
    island: string
    noRentals: string
    risksH3: string
    bestFor: string
    next: string
    villas: (name: string) => [string, string]
    apartments: (name: string) => [string, string]
    complexes: (name: string) => [string, string]
    guide: [string, string]
    map: string
    mapLink: string
  }
}
