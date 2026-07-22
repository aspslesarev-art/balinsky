import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Porównaj nieruchomości na Bali — lista wybranych | Balinsky',
  description: 'Lista wybranych i porównanie obok siebie willi, apartamentów i kompleksów mieszkaniowych na Bali — cena, powierzchnia, leasehold, pozwolenia i deklarowana rentowność w jednej tabeli.',
  alternates: {
    canonical: '/pl/ulubione',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/pl/ulubione` , 'x-default': `${SITE_URL}/ru/izbrannoe`},
  },
}

export default function Page() {
  return <ShortlistView lang="pl" />
}
