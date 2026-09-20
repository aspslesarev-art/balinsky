import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Perjalanan peninjauan properti Bali — atur sendiri | Balinsky',
  description: 'Cara merencanakan sendiri perjalanan peninjauan properti di Bali: visa dan waktu, berapa hari, apa yang diperiksa di lokasi, apa yang ditanyakan ke pengembang, di mana mencari pengacara independen. Balinsky tidak mengorganisasi perjalanan.',
  keywords: ['tur properti Bali', 'tur investasi real estat Bali', 'beli vila Bali', 'properti Bali orang asing', 'leasehold Bali', 'PT PMA properti Bali'],
  alternates: {
    canonical: '/id/invest-tour',
    languages: hreflangMap('/ru/invest-tour'),
  },
  openGraph: {
    title: 'Perjalanan peninjauan properti Bali: atur sendiri',
    description: 'Visa, waktu, hal yang diperiksa di lokasi, pertemuan dengan pengembang, dan pengacara independen — panduan untuk pembeli mandiri.',
    url: `${SITE_URL}/id/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="id" />
}
