import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'AI-пошук нерухомості · Balinsky',
  description: 'Опишіть свою ідеальну нерухомість звичайною мовою — система знайде вілли, апартаменти та комплекси за змістом.',
}

export default function Page() {
  return <SemanticSearchClient lang="uk" />
}
