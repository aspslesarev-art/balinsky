import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'AI 房产搜索 · Balinsky',
  description: '用日常语言描述您理想中的房产 — 系统会按语义为您找到别墅、公寓和综合体。',
}

export default function Page() {
  return <SemanticSearchClient lang="zh" />
}
