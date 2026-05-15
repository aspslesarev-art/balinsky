import { HomePageContent } from '@/components/HomePageContent'

export const revalidate = 1800

export const metadata = {
  title: 'Balinsky — недвижимость на Бали: виллы, апартаменты, жилые комплексы',
  description:
    'Каталог недвижимости Бали с фото, ценами и фильтрами. Виллы, апартаменты, жилые комплексы и проверенные застройщики. Свежие новости, акции и мероприятия.',
  alternates: {
    canonical: '/ru',
    languages: { ru: '/ru', en: '/en', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Balinsky — недвижимость на Бали',
    description: 'Виллы, апартаменты и жилые комплексы Бали. Проверенные застройщики.',
    type: 'website',
    url: '/ru',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balinsky — недвижимость на Бали',
    description: 'Виллы, апартаменты и жилые комплексы Бали. Проверенные застройщики.',
    images: ['/balina.jpg'],
  },
}

export default function RuHome() {
  return <HomePageContent lang="ru" />
}
