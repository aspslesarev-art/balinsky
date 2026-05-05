import { KnowledgeList, generateKnowledgeListMetadata } from './_page'

export const revalidate = 600
export const metadata = generateKnowledgeListMetadata('ru')

export default async function Page() {
  return <KnowledgeList lang="ru" />
}
