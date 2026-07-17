import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'AI-vastgoedzoekopdracht · Balinsky',
  description: 'Beschrijf je ideale woning in gewone taal — het systeem vindt villa’s, appartementen en complexen op basis van betekenis.',
}

export default function Page() {
  return <SemanticSearchClient lang="nl" />
}
