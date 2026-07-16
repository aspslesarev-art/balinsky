import { ApartmentDetail, generateApartmentMetadata } from '../../../../ru/apartamenty/o/[slug]/_detail'

export const revalidate = 3600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateApartmentMetadata(slug, 'en')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <ApartmentDetail slug={slug} lang="id" />
}
