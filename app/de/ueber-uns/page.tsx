import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Über Balinsky — was wir sind und wie wir arbeiten | Balinsky',
  description: 'Balinsky ist eine Datenseite zu Bali-Immobilien: Preise im Vergleich zum Viertel, Mieten in der Nähe, Pachtdauer. Was wir prüfen und was nicht, woher die Zahlen kommen, wie wir Fehler korrigieren.',
  alternates: {
    canonical: '/de/ueber-uns',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'Über Balinsky',
    description: 'Daten zu Bali-Immobilien: was wir prüfen, woher die Zahlen kommen.',
    url: `${SITE_URL}/de/ueber-uns`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="de" />
}
