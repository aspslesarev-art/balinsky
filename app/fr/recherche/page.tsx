import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'Recherche immobilière par IA · Balinsky',
  description: 'Décrivez votre bien idéal en langage naturel — le système trouve villas, appartements et complexes par le sens.',
}

export default function Page() {
  return <SemanticSearchClient lang="fr" />
}
