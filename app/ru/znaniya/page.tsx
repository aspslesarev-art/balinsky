import { KnowledgeList, generateKnowledgeListMetadata, pickAudience } from './_page'

type SP = Promise<Record<string, string | string[] | undefined>>

export const revalidate = 600

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return generateKnowledgeListMetadata('ru', pickAudience(sp.for))
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <KnowledgeList lang="ru" audience={pickAudience(sp.for)} />
}
