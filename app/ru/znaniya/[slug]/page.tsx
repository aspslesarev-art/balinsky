import { KnowledgeDetail, generateKnowledgeDetailMetadata } from './_detail'

export const revalidate = 3600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateKnowledgeDetailMetadata(slug, 'ru')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <KnowledgeDetail slug={slug} lang="ru" />
}
