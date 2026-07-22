import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'Wyszukiwanie nieruchomości AI · Balinsky',
  description: 'Opisz swoją idealną nieruchomość zwykłym językiem — system znajdzie wille, apartamenty i kompleksy według znaczenia.',
}

export default function Page() {
  return <SemanticSearchClient lang="pl" />
}
