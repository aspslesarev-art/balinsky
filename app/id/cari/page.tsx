import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'Pencarian properti AI · Balinsky',
  description: 'Deskripsikan properti ideal Anda dengan bahasa sehari-hari — sistem menemukan vila, apartemen, dan kompleks berdasarkan makna.',
}

export default function Page() {
  return <SemanticSearchClient lang="id" />
}
