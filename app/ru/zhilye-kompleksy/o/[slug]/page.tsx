import { ComplexDetail, generateComplexMetadata } from './_detail'

export const revalidate = 3600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateComplexMetadata(slug, 'ru')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <ComplexDetail slug={slug} lang="ru" />
}
