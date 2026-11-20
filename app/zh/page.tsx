import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: '面向外国人的巴厘岛房产 — 租赁产权（Leasehold）别墅与公寓 | Balinsky',
  description: '面向外国人的巴厘岛房产平台：来自开发商的租赁产权（Leasehold）别墅与公寓。每套房源都列出价格、土地租期、文件和收益。',
  alternates: {
    canonical: '/zh',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: '面向外国人的巴厘岛房产 — 全部为租赁产权',
    description: '面向外国人的巴厘岛房产平台：来自开发商的租赁产权（Leasehold）别墅与公寓。每套房源都列出价格、土地租期、文件和收益。',
    type: 'website',
    url: '/zh',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '面向外国人的巴厘岛房产 — 全部为租赁产权',
    description: '租赁产权别墅与公寓：每套房源的价格、土地租期、文件和收益。',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="zh" />
}
