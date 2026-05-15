import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Bali property investment tour — on-site viewings and due diligence | Balinsky',
  description: 'On-the-ground programme for foreign buyers: inspect 5–10 listings, sit with developer founders, an hour with a foreigner-deal lawyer, drive through Canggu / Bukit / Ubud / Sanur. Express, Standard and Premium formats.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/en/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/en/invest-tour` , 'x-default': `${SITE_URL}/ru/invest-tour`},
  },
  openGraph: {
    title: 'Bali property investment tour',
    description: 'On-site viewings of 5–10 listings, developer meetings, lawyer for foreign buyers, investment districts overview. Concierge service by Balinsky.',
    url: `${SITE_URL}/en/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="en" />
}
