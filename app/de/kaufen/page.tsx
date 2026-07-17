import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Buying property in Bali as a foreigner — guide | Balinsky',
  description: 'Step-by-step guide to buying a villa or apartment in Bali: leasehold and PT PMA, due diligence, PPAT notary, taxes and fees, common mistakes. Real timelines and numbers.',
  alternates: {
    canonical: '/de/kaufen',
    languages: { ru: `${SITE_URL}/ru/kak-kupit`, en: `${SITE_URL}/de/kaufen` , 'x-default': `${SITE_URL}/ru/kak-kupit`},
  },
  openGraph: {
    title: 'Buying property in Bali as a foreigner',
    description: 'Seven steps, ownership structures, real all-in costs, and FAQ. The Balinsky guide.',
    url: `${SITE_URL}/de/kaufen`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="de" />
}
