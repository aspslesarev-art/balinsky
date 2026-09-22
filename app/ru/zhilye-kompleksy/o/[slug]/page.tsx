import { ComplexDetail, generateComplexMetadata } from './_detail'

// Daily backstop only. Hotspot edits in /admin/visualizations (status
// colours, polygon shapes, target swaps) already propagate instantly via
// the targeted revalidatePath in the hotspot API endpoints, so a short TTL
// bought nothing and cost ISR writes on every crawler hit.
export const revalidate = 86400
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
