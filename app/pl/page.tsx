import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Nieruchomości na Bali dla obcokrajowców — wille i apartamenty w leasehold | Balinsky',
  description: 'Marketplace nieruchomości na Bali dla obcokrajowców: wille i apartamenty w leasehold od deweloperów. Cena, okres dzierżawy gruntu, dokumenty i dochód dla każdej oferty.',
  alternates: {
    canonical: '/pl',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Nieruchomości na Bali dla obcokrajowców — wszystko w leasehold',
    description: 'Marketplace nieruchomości na Bali dla obcokrajowców: wille i apartamenty w leasehold od deweloperów. Cena, okres dzierżawy gruntu, dokumenty i dochód dla każdej oferty.',
    type: 'website',
    url: '/pl',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nieruchomości na Bali dla obcokrajowców — wszystko w leasehold',
    description: 'Wille i apartamenty w leasehold: cena, okres dzierżawy gruntu, dokumenty i dochód dla każdej oferty.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="pl" />
}
