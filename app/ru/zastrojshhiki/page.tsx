import { DevelopersCatalog, parseSort } from './_catalog'

export const revalidate = 3600

export const metadata = {
  title: 'Застройщики на Бали — каталог девелоперов недвижимости 2026 | Balinsky',
  description:
    'Каталог застройщиков Бали с действующими проектами: виллы, апартаменты, жилые комплексы. Сравнение по рейтингу, надёжности, управляющей компании. 80+ компаний.',
  alternates: { canonical: '/ru/zastrojshhiki' },
  openGraph: {
    title: 'Застройщики на Бали — каталог девелоперов 2026 | Balinsky',
    description: 'Каталог застройщиков Бали: рейтинги, репутация, проекты, управляющие компании.',
    type: 'website',
    url: '/ru/zastrojshhiki',
  },
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <DevelopersCatalog sort={parseSort(sp.sort)} lang="ru" />
}
