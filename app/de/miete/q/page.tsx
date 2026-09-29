import { RentalListShell, generateRentalListMetadata, parseRentalSP } from '../../../ru/arenda/_page'
import { loadFreshRental } from '@/lib/rental'
import { generateCategoryMeta, rentalPriceStats } from '@/lib/seo'

export const revalidate = 3600

export async function generateMetadata() {
  const base = generateRentalListMetadata('de')
  const rentals = await loadFreshRental('de')
  const cat = generateCategoryMeta({ category: 'rental', locale: 'de', count: rentals.length, ...rentalPriceStats(rentals) })
  return { ...base, title: cat.title, description: cat.description }
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <RentalListShell initial={parseRentalSP(sp)} lang="de" />
}
