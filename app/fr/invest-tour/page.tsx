import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Voyage de visite immobilière à Bali — l’organiser soi-même | Balinsky',
  description: 'Comment préparer seul un voyage de visite immobilière à Bali : visa et calendrier, nombre de jours, quoi vérifier sur place, quoi demander au promoteur, où trouver un avocat indépendant. Balinsky n’organise pas de voyages.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/fr/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Voyage de visite à Bali : l’organiser soi-même',
    description: 'Visa, calendrier, points à vérifier sur place, rendez-vous promoteurs et avocat indépendant — le guide de l’acheteur autonome.',
    url: `${SITE_URL}/fr/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="fr" />
}
