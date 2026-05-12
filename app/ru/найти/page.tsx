import type { Metadata } from 'next'
import { SemanticSearchClient } from './_client'

export const metadata: Metadata = {
  title: 'AI-поиск недвижимости на Бали · Balinsky',
  description: 'Опишите идеальный объект словами — система найдёт виллы, апартаменты и комплексы по смыслу запроса.',
}

export default function Page() {
  return <SemanticSearchClient lang="ru" />
}
