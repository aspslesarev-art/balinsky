import { NewsList, generateNewsListMetadata } from './_page'

export const revalidate = 600
export const metadata = generateNewsListMetadata('ru')

export default async function Page() {
  return <NewsList lang="ru" />
}
