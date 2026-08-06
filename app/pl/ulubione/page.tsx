import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Porównaj nieruchomości na Bali — lista wybranych | Balinsky',
  description: 'Lista wybranych i porównanie obok siebie willi, apartamentów i kompleksów mieszkaniowych na Bali — cena, powierzchnia, leasehold, pozwolenia i deklarowana rentowność w jednej tabeli.',
  alternates: {
    canonical: '/pl/ulubione',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="pl" />
}
