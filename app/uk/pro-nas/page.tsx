import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Про Balinsky — хто ми і чому нам можна довіряти | Balinsky',
  description: 'Balinsky — це каталог нерухомості на Балі для іноземних покупців: перевірені документи, відео з місця, справжні менеджери з фото та мовами, якими вони спілкуються. Актуальні цифри, хто веде сайт, наші редакційні стандарти.',
  alternates: {
    canonical: '/uk/pro-nas',
    languages: { ru: `${SITE_URL}/ru/o-balinsky`, en: `${SITE_URL}/uk/pro-nas` , 'x-default': `${SITE_URL}/ru/o-balinsky`},
  },
  openGraph: {
    title: 'Про Balinsky',
    description: 'Каталог нерухомості на Балі для іноземних покупців — перевірені документи, відео з місця, справжні менеджери.',
    url: `${SITE_URL}/uk/pro-nas`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="uk" />
}
