import { DeveloperDetail, generateDeveloperMetadata } from '../../../ru/zastrojshhiki/[slug]/_detail'

export const revalidate = 3600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateDeveloperMetadata(slug, 'uk')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <DeveloperDetail slug={slug} lang="uk" />
}
