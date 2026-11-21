import { BadgePage, badgeMetadata } from '../../ru/znachok/_page'

export const metadata = badgeMetadata('en')

type SP = Promise<Record<string, string | string[] | undefined>>

export default function Page({ searchParams }: { searchParams: SP }) {
  return <BadgePage lang="en" searchParams={searchParams} />
}
