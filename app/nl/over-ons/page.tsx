import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Over Balinsky — wat we zijn en hoe we werken | Balinsky',
  description: 'Balinsky is een site met vastgoeddata over Bali: prijzen tegenover de wijk, huur in de buurt, leasetermijnen. Wat we controleren en wat niet, waar de cijfers vandaan komen, hoe we fouten herstellen.',
  alternates: {
    canonical: '/nl/over-ons',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'Over Balinsky',
    description: 'Vastgoeddata over Bali: wat we controleren, waar de cijfers vandaan komen.',
    url: `${SITE_URL}/nl/over-ons`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="nl" />
}
