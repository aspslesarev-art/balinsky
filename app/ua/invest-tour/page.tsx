import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Інвестиційний тур нерухомістю Балі — перегляди на місці та due diligence | Balinsky',
  description: 'Програма на місці для іноземних покупців: огляд 5–10 обʼєктів, зустрічі із засновниками забудовників, година з юристом у справах іноземців, поїздка через Canggu / Bukit / Ubud / Sanur. Формати Express, Standard і Premium.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/ua/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/ua/invest-tour` , 'x-default': `${SITE_URL}/ru/invest-tour`},
  },
  openGraph: {
    title: 'Інвестиційний тур нерухомістю Балі',
    description: 'Перегляд 5–10 обʼєктів на місці, зустрічі із забудовниками, юрист для іноземних покупців, огляд інвестиційних районів. Консьєрж-сервіс від Balinsky.',
    url: `${SITE_URL}/ua/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="uk" />
}
