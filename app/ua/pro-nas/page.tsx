import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Про Balinsky — що це і як ми працюємо | Balinsky',
  description: 'Balinsky — сайт із даними про нерухомість Балі: ціни проти району, ставки оренди сусідів, строки лізхолду. Що ми перевіряємо і чого ні, звідки цифри, як виправляємо помилки.',
  alternates: {
    canonical: '/ua/pro-nas',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'Про Balinsky',
    description: 'Дані про нерухомість Балі: що перевіряємо, звідки цифри.',
    url: `${SITE_URL}/ua/pro-nas`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="uk" />
}
