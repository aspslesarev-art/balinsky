import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: '在巴厘岛购买房产 — 带分析数据的独立市场平台 | Balinsky',
  description:
    '数十家开发商的别墅、公寓和住宅项目汇聚于一个目录。经核实的证件（PBG、SLF）以及来自周边邻里数据的真实租金收益。照片、实时价格、联系方式 — 由你选择。',
  alternates: {
    canonical: '/zh',
    languages: { ru: '/ru', en: '/en', zh: '/zh', 'x-default': '/ru' },
  },
  openGraph: {
    title: '在巴厘岛购买房产 — 带分析数据的独立市场平台',
    description: '数十家开发商的别墅、公寓和住宅项目。经核实的证件以及来自周边邻里数据的真实租金收益 — 选择权和数据都在你这一边。',
    type: 'website',
    url: '/zh',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '在巴厘岛购买房产 — 带分析数据的市场平台',
    description: '数十家开发商的别墅、公寓和住宅项目，附经核实的证件与真实租金收益。',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="zh" />
}
