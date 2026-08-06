import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Как купить недвижимость на Бали — гайд для иностранца | Balinsky',
  description: 'Пошаговая инструкция по покупке виллы или апартаментов на Бали: лизхолд и PT PMA, due diligence, нотариус PPAT, налоги и сборы, типовые ошибки. Реальные сроки и цифры.',
  alternates: {
    canonical: '/ru/kak-kupit',
    languages: hreflangMap('/ru/kak-kupit'),
  },
  openGraph: {
    title: 'Как купить недвижимость на Бали — для иностранца',
    description: 'Семь шагов сделки, структуры владения, реальные расходы и FAQ. Балинский гид.',
    url: `${SITE_URL}/ru/kak-kupit`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="ru" />
}
