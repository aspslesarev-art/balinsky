import { NewsList, generateNewsListMetadata } from './_page'

export const revalidate = 3600
export const metadata = generateNewsListMetadata('ru')

export default async function Page() {
  return <NewsList lang="ru" />
}
