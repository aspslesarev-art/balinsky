import { AuthorPage, generateAuthorMetadata } from './_author'

export const revalidate = 86400
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  return generateAuthorMetadata(slug, 'ru')
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <AuthorPage slug={slug} lang="ru" />
}
