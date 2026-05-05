import { RentalListShell, generateRentalListMetadata, parseRentalSP } from './_page'

export const revalidate = 600
export const metadata = generateRentalListMetadata('ru')

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <RentalListShell initial={parseRentalSP(sp)} lang="ru" />
}
