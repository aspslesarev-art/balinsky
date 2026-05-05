import { KnowledgeDetail, generateKnowledgeDetailMetadata } from '../../../ru/znaniya/[slug]/_detail'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateKnowledgeDetailMetadata(slug, 'en')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <KnowledgeDetail slug={slug} lang="en" />
}
