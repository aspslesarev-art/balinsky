import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'So funktioniert eine Immobilienreservierung auf Bali | Balinsky',
  description: 'Was "reservieren" auf Bali bedeutet: 14-tägige Reservierung, Reservierungsanzahlung von $2–10k, wo die Anzahlung liegt, wie Rückerstattungen funktionieren, Reservierungsformular vs. SPA.',
  alternates: {
    canonical: '/de/reservierung',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/en/reservation`, de: `${SITE_URL}/de/reservierung` , 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: 'So funktioniert eine Immobilienreservierung auf Bali',
    description: '14-tägige exklusive Reservierung, Anzahlung von $2–10k, klare Rückerstattungen — so funktionieren Reservierungen bei Balinsky.',
    url: `${SITE_URL}/de/reservierung`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="de" />
}
