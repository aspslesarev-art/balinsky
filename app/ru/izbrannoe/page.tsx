import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Избранное | Balinsky',
  description: 'Сохранённые виллы, апартаменты и жилые комплексы на Бали.',
  // Personal browser-side list — no value for crawlers.
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/ru/izbrannoe',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites` },
  },
}

export default function Page() {
  return <ShortlistView lang="ru" />
}
