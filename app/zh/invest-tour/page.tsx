import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: '巴厘岛房产考察之行——如何自己安排 | Balinsky',
  description: '如何自己规划巴厘岛看房行程：签证与时间、需要预留几天、在工地查看什么、向开发商问什么、去哪里找独立律师。Balinsky 不组织行程。',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/zh/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: '巴厘岛考察之行：如何自己安排',
    description: '签证、时间安排、现场查看要点、与开发商会面以及独立律师——自主买家的行动指南。',
    url: `${SITE_URL}/zh/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="zh" />
}
