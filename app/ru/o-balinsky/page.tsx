import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'О Balinsky — что это и почему ему можно доверять | Balinsky',
  description: 'Balinsky — каталог недвижимости Бали для иностранцев: проверенные документы, видео с земли, реальные менеджеры с фото и языками. Цифры в каталоге, оператор сайта, редакторские стандарты публикации.',
  alternates: {
    canonical: '/ru/o-balinsky',
    languages: { ru: `${SITE_URL}/ru/o-balinsky`, en: `${SITE_URL}/en/about` },
  },
  openGraph: {
    title: 'О Balinsky',
    description: 'Каталог недвижимости Бали для иностранцев — проверенные документы, видео с земли, живые менеджеры.',
    url: `${SITE_URL}/ru/o-balinsky`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="ru" />
}
