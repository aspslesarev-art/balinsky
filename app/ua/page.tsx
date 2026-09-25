import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Нерухомість Балі в цифрах — ціни, оренда, порівняння перед купівлею | Balinsky',
  description: 'Вілли та апартаменти від десятків забудовників, звірені з тисячами об\'єктів оренди на Балі: ціна за м² проти району, ставки сусідів, строк лізхолду та статус дозволів. Безкоштовно, без реєстрації.',
  alternates: {
    canonical: '/ua',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Нерухомість Балі в цифрах — ціни, оренда, порівняння перед купівлею',
    description: 'Вілли та апартаменти від десятків забудовників, звірені з тисячами об\'єктів оренди на Балі: ціна за м² проти району, ставки сусідів, строк лізхолду та статус дозволів. Безкоштовно, без реєстрації.',
    type: 'website',
    url: '/ua',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Нерухомість Балі в цифрах',
    description: 'Ціна за м² проти району, ставки оренди сусідів, строк лізхолду та статус дозволів — порівняйте до купівлі.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="uk" />
}
