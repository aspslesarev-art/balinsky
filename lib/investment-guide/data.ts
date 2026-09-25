// Figures for the investment pillar page — one place for all locales.
// Source: Balinsky catalogue (villas for sale) and Balinsky short-term rental
// database (villas listed for rent, via estatemarket.io), September 2026.
// Method: /en/knowledge/bali-villa-rental-yield-by-area-data.
//
// Two-bedroom villas, 65% occupancy. Net = gross minus 15% platform
// commissions, 20% management, 6% running costs, 10% local accommodation tax PBJT (51% of
// gross revenue); before leasehold amortisation. `indicative` marks rows with
// fewer than 30 sale prices.

export const GUIDE_AS_OF = '2026-09'

export type YieldRow = {
  key: 'canggu' | 'bukit' | 'ubud' | 'nyanyi' | 'nusaDua' | 'island'
  hub: string | null // RU hub path, localised by the page
  price: number; priceN: number
  rate: number; rateN: number
  gross: number; net: number
  indicative: boolean
}

export const YIELD_ROWS: YieldRow[] = [
  { key: 'canggu', hub: '/ru/villy/canggu', price: 309500, priceN: 44, rate: 132, rateN: 1042, gross: 10.1, net: 5.0, indicative: false },
  { key: 'bukit', hub: '/ru/villy/uluwatu', price: 359900, priceN: 43, rate: 164, rateN: 400, gross: 10.8, net: 5.3, indicative: false },
  { key: 'ubud', hub: '/ru/villy/ubud', price: 277500, priceN: 14, rate: 121, rateN: 323, gross: 10.3, net: 5.1, indicative: true },
  { key: 'nyanyi', hub: '/ru/villy/nyanyi', price: 253000, priceN: 17, rate: 116, rateN: 17, gross: 10.9, net: 5.3, indicative: true },
  { key: 'nusaDua', hub: '/ru/villy/nusa-dua', price: 327500, priceN: 9, rate: 108, rateN: 34, gross: 7.8, net: 3.8, indicative: true },
  { key: 'island', hub: '/ru/villy/2-spalni', price: 322500, priceN: 150, rate: 135, rateN: 1966, gross: 9.9, net: 4.9, indicative: false },
]

export const GUIDE_STATS = {
  medianGross2br: '≈10%',
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
