import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Tour inwestycyjny po nieruchomościach na Bali — oglądanie na miejscu i due diligence | Balinsky',
  description: 'Program na miejscu dla zagranicznych kupujących: obejrzyj 5–10 ofert, spotkaj się z założycielami deweloperów, godzina z prawnikiem od transakcji dla obcokrajowców, przejazd przez Canggu / Bukit / Ubud / Sanur. Formaty Express, Standard i Premium.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/pl/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/pl/invest-tour` , 'x-default': `${SITE_URL}/ru/invest-tour`},
  },
  openGraph: {
    title: 'Tour inwestycyjny po nieruchomościach na Bali',
    description: 'Oglądanie 5–10 ofert na miejscu, spotkania z deweloperami, prawnik dla zagranicznych kupujących, przegląd dzielnic inwestycyjnych. Usługa concierge od Balinsky.',
    url: `${SITE_URL}/pl/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="pl" />
}
