import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Comparer des biens à Bali — sélection | Balinsky',
  description: 'Sélection et comparaison côte à côte de villas, appartements et complexes résidentiels à Bali — prix, superficie, leasehold, permis et rendement annoncé dans un seul tableau.',
  alternates: {
    canonical: '/fr/favoris',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="fr" />
}
