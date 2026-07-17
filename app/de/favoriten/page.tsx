import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Bali-Immobilien vergleichen — Merkliste | Balinsky',
  description: 'Merkliste und direkter Vergleich von Villen, Apartments und Wohnkomplexen auf Bali — Preis, Fläche, Leasehold, Genehmigungen und angegebene Rendite in einer Tabelle.',
  alternates: {
    canonical: '/de/favoriten',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites`, de: `${SITE_URL}/de/favoriten` , 'x-default': `${SITE_URL}/ru/izbrannoe`},
  },
}

export default function Page() {
  return <ShortlistView lang="de" />
}
