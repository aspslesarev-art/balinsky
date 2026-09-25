import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Ceny nieruchomości i dane o najmie na Bali — porównaj przed zakupem | Balinsky',
  description: 'Wille i apartamenty od dziesiątek deweloperów zestawione z tysiącami obiektów na wynajem na Bali: cena za m² na tle dzielnicy, stawki najmu w okolicy, okres dzierżawy i status pozwoleń. Za darmo, bez rejestracji.',
  alternates: {
    canonical: '/pl',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Ceny nieruchomości i dane o najmie na Bali — porównaj przed zakupem',
    description: 'Wille i apartamenty od dziesiątek deweloperów zestawione z tysiącami obiektów na wynajem na Bali: cena za m² na tle dzielnicy, stawki najmu w okolicy, okres dzierżawy i status pozwoleń. Za darmo, bez rejestracji.',
    type: 'website',
    url: '/pl',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nieruchomości na Bali w liczbach',
    description: 'Cena za m² na tle dzielnicy, stawki najmu w okolicy, okres dzierżawy i status pozwoleń — porównaj przed zakupem.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="pl" />
}
