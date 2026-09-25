import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Palancaran nyingakin properti Bali — atur padidi | Balinsky',
  description: 'Visa, galah, sane katureksain ring genah, pasamuhan sareng pangwangun, miwah advokat independen — tuntunan buat sang numbas sane mamargi padidi.',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/ban/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Palancaran nyingakin ring Bali: atur padidi',
    description: 'Visa, galah, sane katureksain ring genah, pasamuhan sareng pangwangun, miwah advokat independen — tuntunan buat sang numbas sane mamargi padidi.',
    url: `${SITE_URL}/ban/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="ban" />
}
