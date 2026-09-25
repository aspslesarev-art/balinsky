import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: '巴厘岛房产价格与租金数据 — 买前先比较 | Balinsky',
  description: '巴厘岛别墅与公寓的市场对比：每平方米价格与区域对比、周边租金、租赁年限及许可状态。免费，无需注册。',
  alternates: {
    canonical: '/zh',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: '巴厘岛房产价格与租金数据 — 买前先比较',
    description: '巴厘岛别墅与公寓的市场对比：每平方米价格与区域对比、周边租金、租赁年限及许可状态。免费，无需注册。',
    type: 'website',
    url: '/zh',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '用数据看巴厘岛房产',
    description: '每平方米价格与区域对比、周边租金、租赁年限与许可状态 — 买前先比较。',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="zh" />
}
