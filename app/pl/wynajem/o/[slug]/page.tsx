import { RentalDetail, generateRentalDetailMetadata } from '../../../../ru/arenda/o/[slug]/_detail'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateRentalDetailMetadata(slug, 'pl')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <RentalDetail slug={slug} lang="pl" />
}
