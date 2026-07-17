import { EventDetail, generateEventDetailMetadata } from '../../../ru/meropriyatiya/[slug]/_detail'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateEventDetailMetadata(slug, 'zh')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <EventDetail slug={slug} lang="zh" />
}
