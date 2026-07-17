import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Hoe een vastgoedreservering op Bali werkt | Balinsky',
  description: 'Wat "reserveren" op Bali betekent: reservering van 14 dagen, aanbetaling van $2–10k, waar de aanbetaling staat, hoe terugbetalingen werken, reserveringsformulier vs SPA.',
  alternates: {
    canonical: '/nl/reservering',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/en/reservation`, nl: `${SITE_URL}/nl/reservering` , 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: 'Hoe een vastgoedreservering op Bali werkt',
    description: '14 dagen exclusieve reservering, aanbetaling van $2–10k, heldere terugbetalingen — hoe reserveringen werken op Balinsky.',
    url: `${SITE_URL}/nl/reservering`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="nl" />
}
