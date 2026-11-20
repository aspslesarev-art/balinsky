import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Vastgoed op Bali voor buitenlanders — villa’s en appartementen in leasehold | Balinsky',
  description: 'Vastgoedmarktplaats van Bali voor buitenlanders: villa’s en appartementen in leasehold van ontwikkelaars. Prijs, looptijd van de grondhuur, documenten en rendement per object.',
  alternates: {
    canonical: '/nl',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Vastgoed op Bali voor buitenlanders — alles in leasehold',
    description: 'Vastgoedmarktplaats van Bali voor buitenlanders: villa’s en appartementen in leasehold van ontwikkelaars. Prijs, looptijd van de grondhuur, documenten en rendement per object.',
    type: 'website',
    url: '/nl',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vastgoed op Bali voor buitenlanders — alles in leasehold',
    description: 'Villa’s en appartementen in leasehold: prijs, looptijd van de grondhuur, documenten en rendement per object.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="nl" />
}
