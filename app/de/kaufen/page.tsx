import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Immobilienkauf auf Bali als Ausländer — Leitfaden | Balinsky',
  description: 'Schritt-für-Schritt-Leitfaden zum Kauf einer Villa oder eines Apartments auf Bali: Leasehold und PT PMA, Due Diligence, PPAT-Notar, Steuern und Gebühren, häufige Fehler. Echte Zeitpläne und Zahlen.',
  alternates: {
    canonical: '/de/kaufen',
    languages: hreflangMap('/ru/kak-kupit'),
  },
  openGraph: {
    title: 'Immobilienkauf auf Bali als Ausländer',
    description: 'Sieben Schritte, Eigentumsstrukturen, echte Gesamtkosten und FAQ. Der Balinsky-Leitfaden.',
    url: `${SITE_URL}/de/kaufen`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="de" />
}
