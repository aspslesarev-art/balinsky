import { ComplexDetail, generateComplexMetadata } from '../../../../ru/zhilye-kompleksy/o/[slug]/_detail'

export const revalidate = 60
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateComplexMetadata(slug, 'ban')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <ComplexDetail slug={slug} lang="ban" />
}
