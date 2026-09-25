import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Bali property viewing trip — how to plan one yourself | Balinsky',
  description: 'Visa, timing, what to check on site, developer meetings and an independent lawyer — a guide for the buyer travelling on their own.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/en/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Bali property viewing trip: how to plan it yourself',
    description: 'Visa, timing, what to check on site, developer meetings and an independent lawyer — a guide for the buyer travelling on their own.',
    url: `${SITE_URL}/en/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="en" />
}
