import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Bali property investment tour | Balinsky',
  description: 'Fly in for 3–5 days — we meet you at the airport, walk you through 5–10 listings, line up developer and lawyer meetings. Express, Standard and Premium formats.',
  alternates: {
    canonical: '/en/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/en/invest-tour` },
  },
  openGraph: {
    title: 'Bali property investment tour',
    description: '5–10 listings on the ground, developer meetings, lawyer block, district drive. Concierge service by Balinsky.',
    url: `${SITE_URL}/en/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="en" />
}
