import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Immobilien auf Bali für Ausländer – Villen & Apartments im Leasehold | Balinsky',
  description: 'Immobilienmarktplatz Bali für Ausländer: Villen und Apartments im Leasehold (Erbpacht) direkt vom Bauträger. Preis, Pachtdauer, Dokumente und Ertrag zu jedem Objekt.',
  alternates: {
    canonical: '/de',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Immobilien auf Bali für Ausländer – alles im Leasehold',
    description: 'Immobilienmarktplatz Bali für Ausländer: Villen und Apartments im Leasehold (Erbpacht) direkt vom Bauträger. Preis, Pachtdauer, Dokumente und Ertrag zu jedem Objekt.',
    type: 'website',
    url: '/de',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Immobilien auf Bali für Ausländer – alles im Leasehold',
    description: 'Villen und Apartments im Leasehold: Preis, Pachtdauer, Dokumente und Ertrag zu jedem Objekt.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="de" />
}
