import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Comment fonctionne la réservation d’un bien à Bali | Balinsky',
  description: 'Ce que « réserver » signifie à Bali : blocage de 14 jours, dépôt de garantie de 2 à 10 k$, où est conservé le dépôt, comment fonctionnent les remboursements, formulaire de réservation vs SPA.',
  alternates: {
    canonical: '/fr/reservation',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/en/reservation`, fr: `${SITE_URL}/fr/reservation` , 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: 'Comment fonctionne la réservation d’un bien à Bali',
    description: 'Blocage exclusif de 14 jours, dépôt de 2 à 10 k$, remboursements clairs — comment fonctionnent les réservations sur Balinsky.',
    url: `${SITE_URL}/fr/reservation`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="fr" />
}
