import { KnowledgeList, generateKnowledgeListMetadata } from '../../ru/znaniya/_page'

export const revalidate = 600
export const metadata = generateKnowledgeListMetadata('en')

export default async function Page() {
  return <KnowledgeList lang="en" />
}
