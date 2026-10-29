import { AuthorPage, generateAuthorMetadata } from '../../../ru/avtory/[slug]/_author'

export const revalidate = 604800
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateAuthorMetadata(slug, 'en')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <AuthorPage slug={slug} lang="en" />
}
