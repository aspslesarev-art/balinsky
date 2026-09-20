import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Инвест-тур на Бали — как самому организовать поездку на осмотр | Balinsky',
  description: 'Как самостоятельно спланировать поездку на Бали для осмотра недвижимости: виза и сроки, сколько дней закладывать, что проверять на площадке, о чём спрашивать застройщика, где искать независимого юриста. Balinsky поездок не организует.',
  keywords: ['инвест-тур Бали', 'тур по недвижимости Бали', 'купить виллу на Бали', 'инвестиции в недвижимость Бали', 'leasehold Бали', 'недвижимость Бали для иностранцев'],
  alternates: {
    canonical: '/ru/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Инвест-тур на Бали: как организовать поездку самому',
    description: 'Виза, сроки, что проверять на площадке, встречи с застройщиком и независимый юрист — инструкция для самостоятельного покупателя.',
    url: `${SITE_URL}/ru/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="ru" />
}
