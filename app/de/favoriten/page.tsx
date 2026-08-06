import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Bali-Immobilien vergleichen — Merkliste | Balinsky',
  description: 'Merkliste und direkter Vergleich von Villen, Apartments und Wohnkomplexen auf Bali — Preis, Fläche, Leasehold, Genehmigungen und angegebene Rendite in einer Tabelle.',
  alternates: {
    canonical: '/de/favoriten',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="de" />
}
