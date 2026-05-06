import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Инвест-тур по объектам Бали | Balinsky',
  description: 'Прилетайте на 3–5 дней — встретим в аэропорту, покажем 5–10 объектов под вашу задачу, организуем встречи с застройщиками и юристом. Express, Standard и Premium форматы.',
  alternates: {
    canonical: '/ru/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/en/invest-tour` },
  },
  openGraph: {
    title: 'Инвест-тур по объектам Бали',
    description: '5–10 объектов, встречи с застройщиками, юрист, обзор районов. Концирж-сервис от Balinsky.',
    url: `${SITE_URL}/ru/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="ru" />
}
