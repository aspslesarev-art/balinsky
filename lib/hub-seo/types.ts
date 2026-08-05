// Long-form SEO copy for the catalog hubs (/villy, /apartamenty).
//
// The short intro/context/FAQ that every catalog page carries lives inside the
// COPY objects of components/VillasSeoContent.tsx and components/SeoContent.tsx.
// THIS layer is the extra ~900 words rendered ONLY on the unfiltered list hub —
// the page that has to rank for the head terms («купить виллу на Бали»,
// «виллы на бали цены»). Keeping it off the filtered pages is deliberate:
// 2300 district/bedroom pages sharing the same 900 words would read as
// near-duplicate content.
//
// Numbers quoted in the copy come from the live catalog (same aggregation as
// `node scripts/kb-aggregates.mjs --dry-run`); refresh them when the market
// moves rather than inventing new ones.

export type HubSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

/** The price-by-bedrooms table — the block that answers «сколько стоит». */
export type HubPriceTable = {
  caption: string
  columns: readonly [string, string, string, string]
  rows: readonly (readonly [string, string, string, string])[]
  note: string
}

export type HubFaqItem = {
  q: string
  a: string
}

export type HubLongCopy = {
  /** Rendered in order; the price table is injected after the first section. */
  sections: readonly HubSection[]
  priceTable: HubPriceTable
  /** Appended to the component's own FAQ list and to its FAQPage JSON-LD. */
  faqExtra: readonly HubFaqItem[]
}
