import { NewsDetail, generateNewsDetailMetadata } from '../../../ru/novosti/[slug]/_detail'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateNewsDetailMetadata(slug, 'en')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <NewsDetail slug={slug} lang="id" />
}
