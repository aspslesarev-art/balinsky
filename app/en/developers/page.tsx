import { DevelopersCatalog, parseSort } from '../../ru/zastrojshhiki/_catalog'

export const revalidate = 3600

export const metadata = {
  title: 'Bali property developers — 2026 directory | Balinsky',
  description:
    'Directory of Bali developers with active projects: villas, apartments, residential complexes. Compare on score, reliability and post-handover management. 80+ companies.',
  alternates: { canonical: '/en/developers' },
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
