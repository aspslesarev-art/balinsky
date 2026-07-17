import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: '外国人在巴厘岛购房 — 指南 | Balinsky',
  description: '在巴厘岛购买别墅或公寓的分步指南：leasehold 与 PT PMA、尽职调查、PPAT 公证、税费、常见错误。真实的时间表和数字。',
  alternates: {
    canonical: '/zh/ruhe-goumai',
    languages: { ru: `${SITE_URL}/ru/kak-kupit`, en: `${SITE_URL}/en/how-to-buy`, zh: `${SITE_URL}/zh/ruhe-goumai` , 'x-default': `${SITE_URL}/ru/kak-kupit`},
  },
  openGraph: {
    title: '外国人在巴厘岛购房',
    description: '七个步骤、产权结构、真实的全包成本，以及常见问题。Balinsky 指南。',
    url: `${SITE_URL}/zh/ruhe-goumai`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="zh" />
}
