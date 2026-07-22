import { DevelopersCatalog, parseSort } from '../../ru/zastrojshhiki/_catalog'
import { generateCategoryMeta } from '@/lib/seo'
import { publishedDeveloperCount } from '@/lib/category-stats'

export const revalidate = 3600

export async function generateMetadata() {
  const cat = generateCategoryMeta({ category: 'developers', locale: 'uk', ...(await publishedDeveloperCount()) })
  return { ...metadata, title: cat.title, description: cat.description }
}

const metadata = {
  title: 'Забудовники нерухомості на Балі — каталог 2026 | Balinsky',
  description:
    'Каталог забудовників Балі з активними проєктами: вілли, апартаменти, житлові комплекси. Порівнюйте за оцінкою, надійністю та управлінням після здачі. 80+ компаній.',
  alternates: {
    canonical: '/uk/zabudovnyky',
    languages: {
      ru: '/ru/zastrojshhiki',
      uk: '/uk/zabudovnyky',
      'x-default': '/ru/zastrojshhiki',
    },
  },
  openGraph: {
    title: 'Забудовники нерухомості на Балі — каталог 2026 | Balinsky',
    description: 'Каталог забудовників Балі: оцінки, репутація, проєкти, керуючі компанії.',
    type: 'website',
    url: '/uk/zabudovnyky',
  },
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <DevelopersCatalog sort={parseSort(sp.sort)} lang="uk" />
}
