import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Vastgoed op Bali vergelijken — shortlist | Balinsky',
  description: 'Shortlist en directe vergelijking van villa’s, appartementen en wooncomplexen op Bali — prijs, oppervlakte, leasehold, vergunningen en geclaimd rendement in één tabel.',
  alternates: {
    canonical: '/nl/favorieten',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="nl" />
}
