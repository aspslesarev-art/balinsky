import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: '关于 Balinsky — 我们是什么，以及为何值得信赖 | Balinsky',
  description: 'Balinsky 是面向境外买家的巴厘岛房产目录：核验过的文件、实地视频、有照片和所说语言的真实经理。实时数据、网站由谁运营、我们的编辑标准。',
  alternates: {
    canonical: '/zh/guanyu',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: '关于 Balinsky',
    description: '面向境外买家的巴厘岛房产目录 — 核验过的文件、实地视频、真实经理。',
    url: `${SITE_URL}/zh/guanyu`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="zh" />
}
