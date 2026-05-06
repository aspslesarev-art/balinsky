import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Инвест-тур по недвижимости Бали — личный осмотр объектов и due diligence | Balinsky',
  description: 'Программа выезда на Бали для покупки виллы или апартаментов: 5–10 проектов из шорт-листа, встречи с застройщиками, юрист по сделкам для иностранцев, обзор Чангу / Букит / Убуд / Санур. Express, Standard и Premium форматы.',
  keywords: ['инвест-тур Бали', 'тур по недвижимости Бали', 'купить виллу на Бали', 'инвестиции в недвижимость Бали', 'leasehold Бали', 'недвижимость Бали для иностранцев'],
  alternates: {
    canonical: '/ru/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/en/invest-tour` },
  },
  openGraph: {
    title: 'Инвест-тур по недвижимости Бали',
    description: 'Личный осмотр 5–10 объектов, встречи с застройщиками, юрист по сделкам для иностранцев, обзор инвестиционных районов. Концирж-сервис Balinsky.',
    url: `${SITE_URL}/ru/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="ru" />
}
