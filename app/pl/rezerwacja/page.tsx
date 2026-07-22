import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Jak działa rezerwacja nieruchomości na Bali | Balinsky',
  description: 'Co oznacza „rezerwacja” na Bali: 14-dniowa blokada, kaucja rezerwacyjna 2–10 tys. USD, gdzie trafia kaucja, jak działają zwroty, formularz rezerwacji a SPA.',
  alternates: {
    canonical: '/pl/rezerwacja',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/pl/rezerwacja` , 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: 'Jak działa rezerwacja nieruchomości na Bali',
    description: '14-dniowa wyłączna blokada, kaucja 2–10 tys. USD, jasne zwroty — jak działają rezerwacje w Balinsky.',
    url: `${SITE_URL}/pl/rezerwacja`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="pl" />
}
