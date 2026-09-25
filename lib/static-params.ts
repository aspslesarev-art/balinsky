// Param lists for routes that must be ISR-cached rather than rendered on every
// request. A dynamic route without generateStaticParams is server-rendered per
// hit (Cache-Control: no-store) even with `revalidate` set; listing the known
// params prerenders them, and dynamicParams (default true) still serves any
// other value on demand, then caches it.

/** Same list the sitemap emits for the district investment pages. */
export const INVEST_DISTRICTS = ['canggu', 'uluwatu', 'ubud', 'sanur', 'pererenan', 'berawa', 'nusa-dua', 'nyanyi', 'melasti', 'kerobokan', 'cemagi', 'umalas'] as const

export const COMPLETION_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028'] as const

export const districtParams = () => INVEST_DISTRICTS.map(district => ({ district }))
export const yearParams = () => COMPLETION_YEARS.map(year => ({ year }))
