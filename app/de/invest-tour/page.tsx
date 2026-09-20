import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Besichtigungsreise nach Bali — selbst organisieren | Balinsky',
  description: 'Wie Sie eine Immobilien-Besichtigungsreise nach Bali selbst planen: Visum und Zeitplan, wie viele Tage, was vor Ort zu prüfen ist, was Sie den Bauträger fragen, wo Sie einen unabhängigen Anwalt finden. Balinsky organisiert keine Reisen.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/de/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Besichtigungsreise nach Bali: selbst organisieren',
    description: 'Visum, Zeitplan, Prüfpunkte vor Ort, Bauträgertermine und ein unabhängiger Anwalt — ein Leitfaden für Selbstorganisierer.',
    url: `${SITE_URL}/de/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="de" />
}
