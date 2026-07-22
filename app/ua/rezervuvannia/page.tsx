import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Як працює бронювання нерухомості на Балі | Balinsky',
  description: 'Що означає «бронювання» на Балі: блокування на 14 днів, завдаток 2–10 тис. USD, де зберігається завдаток, як працюють повернення, форма бронювання проти SPA.',
  alternates: {
    canonical: '/ua/rezervuvannia',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/ua/rezervuvannia` , 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: 'Як працює бронювання нерухомості на Балі',
    description: 'Ексклюзивне блокування на 14 днів, завдаток 2–10 тис. USD, зрозумілі повернення — як працюють бронювання в Balinsky.',
    url: `${SITE_URL}/ua/rezervuvannia`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="uk" />
}
