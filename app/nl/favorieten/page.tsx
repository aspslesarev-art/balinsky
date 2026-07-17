import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Vastgoed op Bali vergelijken — shortlist | Balinsky',
  description: 'Shortlist en directe vergelijking van villa’s, appartementen en wooncomplexen op Bali — prijs, oppervlakte, leasehold, vergunningen en geclaimd rendement in één tabel.',
  alternates: {
    canonical: '/nl/favorieten',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites`, nl: `${SITE_URL}/nl/favorieten` , 'x-default': `${SITE_URL}/ru/izbrannoe`},
  },
}

export default function Page() {
  return <ShortlistView lang="nl" />
}
