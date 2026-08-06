import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: '对比巴厘岛房产 — 收藏夹 | Balinsky',
  description: '巴厘岛别墅、公寓和住宅综合体的收藏与并排对比 — 价格、面积、leasehold、许可证和宣称收益一表尽览。',
  alternates: {
    canonical: '/zh/shoucang',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="zh" />
}
