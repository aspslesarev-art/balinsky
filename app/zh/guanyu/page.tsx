import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: '关于 Balinsky — 我们是谁，如何工作 | Balinsky',
  description: 'Balinsky 是巴厘岛房产数据网站：价格与区域对比、周边租金、租赁年限。我们核查什么、不核查什么，数据从何而来，如何更正错误。',
  alternates: {
    canonical: '/zh/guanyu',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: '关于 Balinsky',
    description: '巴厘岛房产数据：核查范围、数据来源、更正方式。',
    url: `${SITE_URL}/zh/guanyu`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="zh" />
}
