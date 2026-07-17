import { RentalListShell, generateRentalListMetadata, parseRentalSP } from '../../ru/arenda/_page'
import { loadFreshRental } from '@/lib/rental'
import { generateCategoryMeta } from '@/lib/seo'

export const revalidate = 600

export async function generateMetadata() {
  const base = generateRentalListMetadata('ban')
  const cat = generateCategoryMeta({ category: 'rental', locale: 'ban', count: (await loadFreshRental('ban')).length })
  return { ...base, title: cat.title, description: cat.description }
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <RentalListShell initial={parseRentalSP(sp)} lang="ban" />
}
