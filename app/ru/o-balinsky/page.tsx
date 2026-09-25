import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'О Balinsky — что это и как мы работаем | Balinsky',
  description: 'Balinsky — сайт с данными о недвижимости Бали: цены против района, ставки аренды соседей, сроки лизхолда. Что мы проверяем и чего нет, откуда цифры, как исправляем ошибки.',
  alternates: {
    canonical: '/ru/o-balinsky',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'О Balinsky',
    description: 'Данные о недвижимости Бали: что проверяем, откуда цифры, как исправляем ошибки.',
    url: `${SITE_URL}/ru/o-balinsky`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="ru" />
}
