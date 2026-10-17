import { HomeRu } from '@/components/HomeRu'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Купить виллу на Бали для жизни или сдачи - каждый объект проверен | Balinsky',
  description: 'Виллы и квартиры на Бали с ответами на 4 вопроса: безопасно ли, удобно ли жить, будет ли спрос, сколько принесёт. Документы, пляж, аренда рядом, калькулятор дохода. Бесплатно.',
  alternates: {
    canonical: '/ru',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Купить виллу на Бали для жизни или сдачи - каждый объект проверен',
    description: 'Виллы и квартиры на Бали с ответами на 4 вопроса: безопасно ли, удобно ли жить, будет ли спрос, сколько принесёт. Документы, пляж, аренда рядом, калькулятор дохода. Бесплатно.',
    type: 'website',
    url: '/ru',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Купить виллу на Бали - каждый объект проверен',
    description: 'Документы, пляж, аренда рядом и калькулятор дохода по каждой вилле и квартире.',
    images: ['/andrei.jpg'],
  },
}

export default function RuHome() {
  return <HomeRu />
}
