import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Bezichtigingsreis naar Bali — zelf organiseren | Balinsky',
  description: 'Visum, timing, controlepunten ter plaatse, afspraken met ontwikkelaars en een onafhankelijke jurist — een gids voor wie het zelf regelt.',
  keywords: ['vastgoedtour Bali', 'vastgoed-investeringstour Bali', 'villa kopen Bali', 'vastgoed Bali buitenlander', 'leasehold Bali', 'PT PMA vastgoed Bali'],
  alternates: {
    canonical: '/nl/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Bezichtigingsreis naar Bali: zelf organiseren',
    description: 'Visum, timing, controlepunten ter plaatse, afspraken met ontwikkelaars en een onafhankelijke jurist — een gids voor wie het zelf regelt.',
    url: `${SITE_URL}/nl/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="nl" />
}
