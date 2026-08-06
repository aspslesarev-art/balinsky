import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'So funktioniert eine Immobilienreservierung auf Bali | Balinsky',
  description: 'Was "reservieren" auf Bali bedeutet: 14-tägige Reservierung, Reservierungsanzahlung von $2–10k, wo die Anzahlung liegt, wie Rückerstattungen funktionieren, Reservierungsformular vs. SPA.',
  alternates: {
    canonical: '/de/reservierung',
    languages: hreflangMap('/ru/rezervirovanie'),
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
