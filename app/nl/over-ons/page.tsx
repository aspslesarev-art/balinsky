import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'About Balinsky — what we are and why you can trust us | Balinsky',
  description: 'Balinsky is a Bali property catalogue for foreign buyers: verified documents, on-the-ground video, real managers with photos and spoken languages. Live numbers, who runs the site, our editorial standards.',
  alternates: {
    canonical: '/nl/over-ons',
    languages: { ru: `${SITE_URL}/ru/o-balinsky`, en: `${SITE_URL}/nl/over-ons` , 'x-default': `${SITE_URL}/ru/o-balinsky`},
  },
  openGraph: {
    title: 'About Balinsky',
    description: 'Bali property catalogue for foreign buyers — verified documents, on-the-ground video, live managers.',
    url: `${SITE_URL}/nl/over-ons`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="nl" />
}
