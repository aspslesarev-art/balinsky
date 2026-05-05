import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Бронирование объекта на Бали — как это работает | Balinsky',
  description: 'Что значит «зарезервировать» на Бали: 14-дневный hold, holding deposit $2-10k, где сидит депозит, как возвращаются деньги, отличие reservation form от SPA.',
  alternates: {
    canonical: '/ru/rezervirovanie',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/en/reservation` },
  },
  openGraph: {
    title: 'Бронирование объекта на Бали',
    description: '14 дней эксклюзивного hold, депозит $2-10k, прозрачный возврат — как устроено резервирование на Balinsky.',
    url: `${SITE_URL}/ru/rezervirovanie`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="ru" />
}
