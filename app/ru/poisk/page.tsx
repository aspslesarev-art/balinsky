import type { Metadata } from 'next'
import { SemanticSearchClient } from './_client'

// The route lives at a Cyrillic path (/ru/найти). Next.js' static
// export step can't encode that segment, so we force the page to
// render on-demand — no prerender, no `generateStaticParams` headache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI-поиск недвижимости на Бали · Balinsky',
  description: 'Опишите идеальный объект словами — система найдёт виллы, апартаменты и комплексы по смыслу запроса.',
}

export default function Page() {
  return <SemanticSearchClient lang="ru" />
}
