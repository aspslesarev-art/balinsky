import { NewsList, generateNewsListMetadata } from '../../ru/novosti/_page'

export const revalidate = 3600
export const metadata = generateNewsListMetadata('en')

export default async function Page() {
  return <NewsList lang="en" />
}
