import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Купить недвижимость на Бали — независимый маркетплейс с аналитикой | Balinsky',
  description:
    'Виллы, апартаменты и ЖК от десятков застройщиков в одном каталоге. Проверенные документы (PBG, SLF) и реальная доходность по данным аренды соседей. Фото, актуальные цены, контакты — выбираете вы.',
  alternates: {
    canonical: '/ru',
    languages: { ru: '/ru', en: '/en', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Купить недвижимость на Бали — независимый маркетплейс с аналитикой',
    description: 'Виллы, апартаменты и ЖК от десятков застройщиков. Проверенные документы и реальная доходность по данным соседей — выбор и цифры на вашей стороне.',
    type: 'website',
    url: '/ru',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Купить недвижимость на Бали — маркетплейс с аналитикой',
    description: 'Виллы, апартаменты и ЖК от десятков застройщиков с проверенными документами и реальной доходностью.',
    images: ['/balina.jpg'],
  },
}

export default function RuHome() {
  return <HomeLanding lang="ru" />
}
