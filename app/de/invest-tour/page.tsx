import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Bali-Immobilien-Investmenttour — Besichtigungen vor Ort und Due Diligence | Balinsky',
  description: 'Programm vor Ort für ausländische Käufer: Besichtigung von 5–10 Angeboten, Treffen mit Bauträger-Gründern, eine Stunde mit einem Anwalt für Auslandsgeschäfte, Fahrt durch Canggu / Bukit / Ubud / Sanur. Formate Express, Standard und Premium.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/de/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Bali-Immobilien-Investmenttour',
    description: 'Besichtigungen von 5–10 Angeboten vor Ort, Treffen mit Bauträgern, Anwalt für ausländische Käufer, Überblick über Investmentbezirke. Concierge-Service von Balinsky.',
    url: `${SITE_URL}/de/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="de" />
}
