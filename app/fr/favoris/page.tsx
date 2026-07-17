import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Comparer des biens à Bali — sélection | Balinsky',
  description: 'Sélection et comparaison côte à côte de villas, appartements et complexes résidentiels à Bali — prix, superficie, leasehold, permis et rendement annoncé dans un seul tableau.',
  alternates: {
    canonical: '/fr/favoris',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites`, fr: `${SITE_URL}/fr/favoris` , 'x-default': `${SITE_URL}/ru/izbrannoe`},
  },
}

export default function Page() {
  return <ShortlistView lang="fr" />
}
