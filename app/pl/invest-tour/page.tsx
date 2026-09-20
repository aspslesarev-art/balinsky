import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Wyjazd na oglądanie nieruchomości na Bali — zorganizuj sam | Balinsky',
  description: 'Jak samodzielnie zaplanować wyjazd na oglądanie nieruchomości na Bali: wiza i terminy, ile dni, co sprawdzić na budowie, o co zapytać dewelopera, gdzie znaleźć niezależnego prawnika. Balinsky nie organizuje wyjazdów.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/pl/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Wyjazd na Bali: zorganizuj go sam',
    description: 'Wiza, terminy, co sprawdzić na budowie, spotkania z deweloperem i niezależny prawnik — przewodnik dla samodzielnego kupującego.',
    url: `${SITE_URL}/pl/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="pl" />
}
