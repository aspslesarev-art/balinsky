import { BadgePage, badgeMetadata } from './_page'

export const metadata = badgeMetadata('ru')

type SP = Promise<Record<string, string | string[] | undefined>>

export default function Page({ searchParams }: { searchParams: SP }) {
  return <BadgePage lang="ru" searchParams={searchParams} />
}
