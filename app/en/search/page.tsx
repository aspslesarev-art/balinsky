import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'AI property search · Balinsky',
  description: 'Describe your ideal property in plain English — the system finds villas, apartments and complexes by meaning.',
}

export default function Page() {
  return <SemanticSearchClient lang="en" />
}
