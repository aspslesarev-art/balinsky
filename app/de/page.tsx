import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Immobilienpreise & Mietdaten auf Bali — vergleichen vor dem Kauf | Balinsky',
  description: 'Villen und Apartments auf Bali im Marktvergleich: Preis pro m², Mieten in der Nähe, Pachtdauer und Genehmigungsstatus. Kostenlos.',
  alternates: {
    canonical: '/de',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Immobilienpreise & Mietdaten auf Bali — vergleichen vor dem Kauf',
    description: 'Villen und Apartments auf Bali im Marktvergleich: Preis pro m², Mieten in der Nähe, Pachtdauer und Genehmigungsstatus. Kostenlos.',
    type: 'website',
    url: '/de',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bali-Immobilien in Zahlen',
    description: 'Preis pro m² im Vergleich zum Viertel, Mieten der Nachbarn, Pachtdauer und Genehmigungsstatus — vor dem Kauf vergleichen.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="de" />
}
