import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Vastgoed-investeringstour op Bali — bezichtigingen ter plaatse en due diligence | Balinsky',
  description: 'Programma ter plaatse voor buitenlandse kopers: bekijk 5–10 aanbiedingen, spreek met oprichters van ontwikkelaars, een uur met een advocaat voor buitenlandse deals, rijd door Canggu / Bukit / Ubud / Sanur. Express-, Standard- en Premium-formats.',
  keywords: ['vastgoedtour Bali', 'vastgoed-investeringstour Bali', 'villa kopen Bali', 'vastgoed Bali buitenlander', 'leasehold Bali', 'PT PMA vastgoed Bali'],
  alternates: {
    canonical: '/nl/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/en/invest-tour`, nl: `${SITE_URL}/nl/invest-tour` , 'x-default': `${SITE_URL}/ru/invest-tour`},
  },
  openGraph: {
    title: 'Vastgoed-investeringstour op Bali',
    description: 'Bezichtigingen ter plaatse van 5–10 aanbiedingen, ontmoetingen met ontwikkelaars, advocaat voor buitenlandse kopers, overzicht van investeringswijken. Conciërgeservice van Balinsky.',
    url: `${SITE_URL}/nl/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="nl" />
}
