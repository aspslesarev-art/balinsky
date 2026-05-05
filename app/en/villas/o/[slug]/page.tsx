import { VillaDetail, generateVillaMetadata } from '../../../../ru/villy/o/[slug]/_detail'

export const revalidate = 3600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateVillaMetadata(slug, 'en')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <VillaDetail slug={slug} lang="en" />
}
