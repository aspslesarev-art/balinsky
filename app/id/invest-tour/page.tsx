import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Tur investasi properti Bali — peninjauan langsung dan uji tuntas | Balinsky',
  description: 'Program di lapangan untuk pembeli asing: meninjau 5–10 listing, bertemu para pendiri pengembang, satu jam dengan pengacara transaksi orang asing, berkeliling Canggu / Bukit / Ubud / Sanur. Format Express, Standard, dan Premium.',
  keywords: ['tur properti Bali', 'tur investasi real estat Bali', 'beli vila Bali', 'properti Bali orang asing', 'leasehold Bali', 'PT PMA properti Bali'],
  alternates: {
    canonical: '/id/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Tur investasi properti Bali',
    description: 'Peninjauan langsung 5–10 listing, pertemuan dengan pengembang, pengacara untuk pembeli asing, gambaran distrik investasi. Layanan concierge oleh Balinsky.',
    url: `${SITE_URL}/id/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="id" />
}
