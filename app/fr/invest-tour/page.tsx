import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Tour d’investissement immobilier à Bali — visites sur place et due diligence | Balinsky',
  description: 'Programme sur le terrain pour acheteurs étrangers : visitez 5 à 10 biens, échangez avec les fondateurs des promoteurs, une heure avec un avocat spécialisé dans les transactions pour étrangers, parcourez Canggu / Bukit / Ubud / Sanur. Formats Express, Standard et Premium.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/fr/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/en/invest-tour`, fr: `${SITE_URL}/fr/invest-tour` , 'x-default': `${SITE_URL}/ru/invest-tour`},
  },
  openGraph: {
    title: 'Tour d’investissement immobilier à Bali',
    description: 'Visites sur place de 5 à 10 biens, rencontres avec les promoteurs, avocat pour acheteurs étrangers, panorama des quartiers d’investissement. Service de conciergerie par Balinsky.',
    url: `${SITE_URL}/fr/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="fr" />
}
