import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Vastgoed kopen op Bali als buitenlander — gids | Balinsky',
  description: 'Stapsgewijze gids voor het kopen van een villa of appartement op Bali: leasehold en PT PMA, due diligence, PPAT-notaris, belastingen en kosten, veelgemaakte fouten. Echte doorlooptijden en cijfers.',
  alternates: {
    canonical: '/nl/hoe-te-kopen',
    languages: { ru: `${SITE_URL}/ru/kak-kupit`, en: `${SITE_URL}/en/how-to-buy`, nl: `${SITE_URL}/nl/hoe-te-kopen` , 'x-default': `${SITE_URL}/ru/kak-kupit`},
  },
  openGraph: {
    title: 'Vastgoed kopen op Bali als buitenlander',
    description: 'Zeven stappen, eigendomsstructuren, echte all-in kosten en FAQ. De gids van Balinsky.',
    url: `${SITE_URL}/nl/hoe-te-kopen`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="nl" />
}
