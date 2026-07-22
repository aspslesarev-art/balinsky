import { DevelopersCatalog, parseSort } from '../../ru/zastrojshhiki/_catalog'
import { generateCategoryMeta } from '@/lib/seo'
import { publishedDeveloperCount } from '@/lib/category-stats'

export const revalidate = 3600

export async function generateMetadata() {
  const cat = generateCategoryMeta({ category: 'developers', locale: 'pl', ...(await publishedDeveloperCount()) })
  return { ...metadata, title: cat.title, description: cat.description }
}

const metadata = {
  title: 'Deweloperzy nieruchomości na Bali — katalog 2026 | Balinsky',
  description:
    'Katalog deweloperów z Bali z aktywnymi projektami: wille, apartamenty, kompleksy mieszkaniowe. Porównuj według oceny, wiarygodności i zarządzania po oddaniu. 80+ firm.',
  alternates: {
    canonical: '/pl/deweloperzy',
    languages: {
      ru: '/ru/zastrojshhiki',
      pl: '/pl/deweloperzy',
      'x-default': '/ru/zastrojshhiki',
    },
  },
  openGraph: {
    title: 'Deweloperzy nieruchomości na Bali — katalog 2026 | Balinsky',
    description: 'Katalog deweloperów z Bali: oceny, wiarygodność, projekty, firmy zarządzające.',
    type: 'website',
    url: '/pl/deweloperzy',
  },
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <DevelopersCatalog sort={parseSort(sp.sort)} lang="pl" />
}
