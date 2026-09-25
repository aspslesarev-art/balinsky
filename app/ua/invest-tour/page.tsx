import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Інвест-тур на Балі — як організувати поїздку самому | Balinsky',
  description: 'Віза, терміни, що перевіряти на майданчику, зустрічі із забудовником і незалежний юрист — інструкція для самостійного покупця.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/ua/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Інвест-тур на Балі: як організувати поїздку самому',
    description: 'Віза, терміни, що перевіряти на майданчику, зустрічі із забудовником і незалежний юрист — інструкція для самостійного покупця.',
    url: `${SITE_URL}/ua/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="uk" />
}
