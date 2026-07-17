import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Acheter un bien immobilier à Bali en tant qu’étranger — guide | Balinsky',
  description: 'Guide pas à pas pour acheter une villa ou un appartement à Bali : leasehold et PT PMA, due diligence, notaire PPAT, taxes et frais, erreurs courantes. Délais et chiffres réels.',
  alternates: {
    canonical: '/fr/comment-acheter',
    languages: { ru: `${SITE_URL}/ru/kak-kupit`, en: `${SITE_URL}/en/how-to-buy`, fr: `${SITE_URL}/fr/comment-acheter` , 'x-default': `${SITE_URL}/ru/kak-kupit`},
  },
  openGraph: {
    title: 'Acheter un bien immobilier à Bali en tant qu’étranger',
    description: 'Sept étapes, structures de propriété, coûts réels tout compris et FAQ. Le guide Balinsky.',
    url: `${SITE_URL}/fr/comment-acheter`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="fr" />
}
