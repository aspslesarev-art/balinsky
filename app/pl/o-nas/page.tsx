import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'O Balinsky — czym jesteśmy i jak pracujemy | Balinsky',
  description: 'Balinsky to serwis z danymi o nieruchomościach na Bali: ceny na tle dzielnicy, stawki najmu w okolicy, okresy dzierżawy. Co sprawdzamy, a czego nie, skąd liczby, jak poprawiamy błędy.',
  alternates: {
    canonical: '/pl/o-nas',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'O Balinsky',
    description: 'Dane o nieruchomościach na Bali: co sprawdzamy, skąd liczby.',
    url: `${SITE_URL}/pl/o-nas`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="pl" />
}
