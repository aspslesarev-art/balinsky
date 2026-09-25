import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Недвижимость Бали в цифрах — цены, аренда, сравнение перед покупкой | Balinsky',
  description: 'Виллы и апартаменты от десятков застройщиков, сверенные с тысячами объектов аренды на Бали: цена за м² против района, ставки соседей, срок лизхолда и статус разрешений. Бесплатно, без регистрации.',
  alternates: {
    canonical: '/ru',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Недвижимость Бали в цифрах — цены, аренда, сравнение перед покупкой',
    description: 'Виллы и апартаменты от десятков застройщиков, сверенные с тысячами объектов аренды на Бали: цена за м² против района, ставки соседей, срок лизхолда и статус разрешений. Бесплатно, без регистрации.',
    type: 'website',
    url: '/ru',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Недвижимость Бали в цифрах',
    description: 'Цена за м² против района, ставки аренды соседей, срок лизхолда и статус разрешений — сравните до покупки.',
    images: ['/andrei.jpg'],
  },
}

export default function RuHome() {
  return <HomeLanding lang="ru" />
}
