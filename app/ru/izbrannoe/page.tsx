import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Сравнение объектов недвижимости на Бали | Balinsky',
  description: 'Шортлист и таблица сравнения вилл, апартаментов и жилых комплексов на Бали — цена, метраж, лизхолд, разрешения и заявленная доходность в одном месте.',
  alternates: {
    canonical: '/ru/izbrannoe',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites` },
  },
}

export default function Page() {
  return <ShortlistView lang="ru" />
}
