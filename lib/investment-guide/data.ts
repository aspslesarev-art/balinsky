// Figures for the investment pillar page — one place for all locales.
// Source: listing_yields (scripts/build-listing-yields.ts) — the same yield
// every villa page shows — joined with the catalogue's area, October 2026.
//
// Two-bedroom villas. `cap` = median yield before income tax: rent at the
// occupancy of similar Booking listings nearby (40th percentile, 60% when there
// are none) and a nightly rate blended from neighbours and the property's
// price, minus platform 16%, management 17%, half of the 10% PBJT, 4% FF&E
// reserve, upkeep and PBB, divided by price + 5% closing + furnishing. `rate` =
// median nightly rate used (villas rented nightly), `rateN` = how many such
// villas; `priceN` = two-bedroom villas in the area. `indicative` marks rows
// with fewer than 30 villas.

export const GUIDE_AS_OF = '2026-10'

export type YieldRow = {
  key: 'canggu' | 'bukit' | 'ubud' | 'nyanyi' | 'nusaDua' | 'island'
  hub: string | null // RU hub path, localised by the page
  price: number; priceN: number
  rate: number; rateN: number
  cap: number
  indicative: boolean
}

// listing_yields, 16.10.2026. Bukit also takes villas filed simply as «Bukit».
export const YIELD_ROWS: YieldRow[] = [
  { key: 'canggu', hub: '/ru/villy/canggu', price: 315000, priceN: 46, rate: 219, rateN: 36, cap: 7.8, indicative: false },
  { key: 'bukit', hub: '/ru/villy/uluwatu', price: 327900, priceN: 51, rate: 200, rateN: 39, cap: 6.2, indicative: false },
  { key: 'ubud', hub: '/ru/villy/ubud', price: 265000, priceN: 21, rate: 188, rateN: 16, cap: 7.3, indicative: true },
  { key: 'nyanyi', hub: '/ru/villy/nyanyi', price: 276500, priceN: 16, rate: 140, rateN: 11, cap: 5.8, indicative: true },
  { key: 'nusaDua', hub: '/ru/villy/nusa-dua', price: 312500, priceN: 11, rate: 193, rateN: 9, cap: 5.8, indicative: true },
  { key: 'island', hub: '/ru/villy/2-spalni', price: 305000, priceN: 171, rate: 200, rateN: 125, cap: 6.9, indicative: false },
]

export const GUIDE_STATS = {
  medianGross2br: '≈7%', // median yield before tax, two-bedroom villas (6.9%)
  catalogue: '806', // published villas (368) + apartments (438)
  permits: '27%', // villas with PBG or SLF on record, of 356 with a status
  rentals: '6,305', // villas listed for rent with a price
}

export const SRC = {
  bpsArrivals: 'https://bali.bps.go.id/en/statistics-table/1/MjgjMQ==/banyaknya-wisatawan-mancanegara-ke-bali-dan-indonesia--1969-2024.html',
  bpsOccupancy: 'https://bali.bps.go.id/id/pressrelease/2026/01/05/718008/perkembangan-pariwisata-provinsi-bali-november-2025.html',
  estatemarket: 'https://www.estatemarket.io',
  pp18: 'https://peraturan.bpk.go.id/Home/Details/161848/pp-no-18-tahun-2021',
  pwcTax: 'https://taxsummaries.pwc.com/indonesia/individual/other-taxes',
  djp: 'https://www.pajak.go.id/en',
  immigration: 'https://www.imigrasi.go.id',
  yieldEn: '/en/knowledge/bali-villa-rental-yield-by-area-data',
  yieldRu: '/ru/znaniya/dohodnost-vill-na-bali-po-rayonam-dannye',
  zoningEn: '/en/knowledge/bali-zoning-permits-villas-for-sale-data',
  zoningRu: '/ru/znaniya/zonirovanie-i-razresheniya-vill-na-bali-v-tsifrah',
}
