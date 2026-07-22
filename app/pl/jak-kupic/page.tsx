import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Zakup nieruchomości na Bali przez obcokrajowca — przewodnik | Balinsky',
  description: 'Przewodnik krok po kroku po zakupie willi lub apartamentu na Bali: leasehold i PT PMA, due diligence, notariusz PPAT, podatki i opłaty, częste błędy. Realne terminy i liczby.',
  alternates: {
    canonical: '/pl/jak-kupic',
    languages: { ru: `${SITE_URL}/ru/kak-kupit`, en: `${SITE_URL}/pl/jak-kupic` , 'x-default': `${SITE_URL}/ru/kak-kupit`},
  },
  openGraph: {
    title: 'Zakup nieruchomości na Bali przez obcokrajowca',
    description: 'Siedem kroków, formy własności, realne koszty całkowite i FAQ. Przewodnik Balinsky.',
    url: `${SITE_URL}/pl/jak-kupic`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="pl" />
}
