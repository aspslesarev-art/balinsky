import { DevelopersCatalog, parseSort } from '../../ru/zastrojshhiki/_catalog'
import { generateCategoryMeta } from '@/lib/seo'
import { publishedDeveloperCount } from '@/lib/category-stats'

export const revalidate = 3600

export async function generateMetadata() {
  const cat = generateCategoryMeta({ category: 'developers', locale: 'en', ...(await publishedDeveloperCount()) })
  return { ...metadata, title: cat.title, description: cat.description }
}

const metadata = {
  title: 'Bali property developers — 2026 directory | Balinsky',
  description:
    'Directory of Bali developers with active projects: villas, apartments, residential complexes. Compare on score, reliability and post-handover management. 80+ companies.',
  alternates: {
    canonical: '/en/developers',
    languages: {
      ru: '/ru/zastrojshhiki',
      en: '/en/developers',
      'x-default': '/ru/zastrojshhiki',
    },
  },
  openGraph: {
    title: 'Bali property developers — 2026 directory | Balinsky',
    description: 'Bali developer directory: scores, reputation, projects, management companies.',
    type: 'website',
    url: '/en/developers',
  },
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <DevelopersCatalog sort={parseSort(sp.sort)} lang="en" />
}
