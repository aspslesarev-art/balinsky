import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Vastgoedprijzen & huurdata Bali — vergelijk vóór u koopt | Balinsky',
  description: 'Villa\'s en appartementen op Bali vergeleken met de markt: prijs per m², huur in de buurt, leasetermijn en vergunningsstatus. Gratis.',
  alternates: {
    canonical: '/nl',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Vastgoedprijzen & huurdata Bali — vergelijk vóór u koopt',
    description: 'Villa\'s en appartementen op Bali vergeleken met de markt: prijs per m², huur in de buurt, leasetermijn en vergunningsstatus. Gratis.',
    type: 'website',
    url: '/nl',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vastgoed op Bali in cijfers',
    description: 'Prijs per m² tegenover de wijk, huurprijzen in de buurt, leasetermijn en vergunningsstatus — vergelijk vóór u koopt.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="nl" />
}
