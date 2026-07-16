import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'How a Bali property reservation works | Balinsky',
  description: 'What "reserve" means on Bali: 14-day hold, $2–10k holding deposit, where the deposit sits, how refunds work, reservation form vs SPA.',
  alternates: {
    canonical: '/id/reservasi',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/id/reservasi` , 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: 'How a Bali property reservation works',
    description: '14-day exclusive hold, $2–10k deposit, clear refunds — how reservations work on Balinsky.',
    url: `${SITE_URL}/id/reservasi`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="id" />
}
