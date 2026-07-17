import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Over Balinsky — wat we zijn en waarom je ons kunt vertrouwen | Balinsky',
  description: 'Balinsky is een vastgoedcatalogus voor Bali gericht op buitenlandse kopers: geverifieerde documenten, video ter plaatse, echte managers met foto’s en gesproken talen. Live cijfers, wie de site beheert, onze redactionele standaarden.',
  alternates: {
    canonical: '/nl/over-ons',
    languages: { ru: `${SITE_URL}/ru/o-balinsky`, en: `${SITE_URL}/en/about`, nl: `${SITE_URL}/nl/over-ons` , 'x-default': `${SITE_URL}/ru/o-balinsky`},
  },
  openGraph: {
    title: 'Over Balinsky',
    description: 'Vastgoedcatalogus voor Bali gericht op buitenlandse kopers — geverifieerde documenten, video ter plaatse, live managers.',
    url: `${SITE_URL}/nl/over-ons`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="nl" />
}
