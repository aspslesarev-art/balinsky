import { HomeRu } from '@/components/HomeRu'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Недвижимость на Бали для иностранцев - виллы и апартаменты в лизхолде | Balinsky',
  description: 'Маркетплейс недвижимости Бали для иностранцев: виллы и апартаменты в лизхолде от застройщиков. Цены, срок аренды земли, документы и доход по каждому объекту.',
  alternates: {
    canonical: '/ru',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Недвижимость на Бали для иностранцев - всё в лизхолде',
    description: 'Маркетплейс недвижимости Бали для иностранцев: виллы и апартаменты в лизхолде от застройщиков. Цены, срок аренды земли, документы и доход по каждому объекту.',
    type: 'website',
    url: '/ru',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Недвижимость на Бали для иностранцев - всё в лизхолде',
    description: 'Виллы и апартаменты в лизхолде: цены, срок аренды земли, документы и доход по каждому объекту.',
    images: ['/andrei.jpg'],
  },
}

export default function RuHome() {
  return <HomeRu />
}
