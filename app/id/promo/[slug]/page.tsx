import { PromoDetail, generatePromoDetailMetadata } from '../../../ru/akcii/[slug]/_detail'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generatePromoDetailMetadata(slug, 'en')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <PromoDetail slug={slug} lang="id" />
}
