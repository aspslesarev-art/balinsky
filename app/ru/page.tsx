import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Balinsky — AI-поиск недвижимости на Бали и в Юго-Восточной Азии',
  description:
    'AI-брокер, который знает каждую виллу, апартаменты и ЖК на Бали. Поиск на русском, английском и индонезийском. Подбор, оценка, сделка — в одной платформе.',
  alternates: {
    canonical: '/ru',
    languages: { ru: '/ru', en: '/en', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Balinsky — AI-поиск недвижимости на Бали',
    description: 'Каждый объект на острове в одной AI-системе. От первого вопроса до подписания договора.',
    type: 'website',
    url: '/ru',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balinsky — AI-поиск недвижимости на Бали',
    description: 'Каждый объект на острове в одной AI-системе.',
    images: ['/balina.jpg'],
  },
}

export default function RuHome() {
  return <HomeLanding lang="ru" />
}
