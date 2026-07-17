import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: '巴厘岛房产预订如何运作 | Balinsky',
  description: '在巴厘岛「预订」意味着什么：14 天保留期、2–10 千美元的保留押金、押金存放在哪里、如何退款、预订单与 SPA 的区别。',
  alternates: {
    canonical: '/zh/yuding',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/en/reservation`, zh: `${SITE_URL}/zh/yuding` , 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: '巴厘岛房产预订如何运作',
    description: '14 天独家保留期、2–10 千美元押金、清晰的退款规则 — Balinsky 上预订的运作方式。',
    url: `${SITE_URL}/zh/yuding`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="zh" />
}
