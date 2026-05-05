import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Compare Bali property — shortlist | Balinsky',
  description: 'Shortlist and side-by-side comparison of Bali villas, apartments and residential complexes — price, area, leasehold, permits and claimed yield in one table.',
  alternates: {
    canonical: '/en/favourites',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites` },
  },
}

export default function Page() {
  return <ShortlistView lang="en" />
}
