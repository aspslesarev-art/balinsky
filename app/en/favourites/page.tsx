import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Compare Bali property — shortlist | Balinsky',
  description: 'Shortlist and side-by-side comparison of Bali villas, apartments and residential complexes — price, area, leasehold, permits and claimed yield in one table.',
  alternates: {
    canonical: '/en/favourites',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="en" />
}
