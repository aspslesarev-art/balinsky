import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Shortlist | Balinsky',
  description: 'Your saved villas, apartments and residential complexes in Bali.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/en/favourites',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites` },
  },
}

export default function Page() {
  return <ShortlistView lang="en" />
}
