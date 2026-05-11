import { ComplexDetail, generateComplexMetadata } from './_detail'

// 60 s instead of 3600 so hotspot edits in /admin/visualizations
// (status colours, polygon shapes, target swaps) propagate within a
// minute rather than an hour. Targeted revalidatePath in the
// hotspot API endpoints pushes the same change instantly.
export const revalidate = 60
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
