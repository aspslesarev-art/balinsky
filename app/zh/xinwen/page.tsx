import { NewsList, generateNewsListMetadata } from '../../ru/novosti/_page'

export const revalidate = 3600
export const metadata = generateNewsListMetadata('zh')

export default async function Page() {
  return <NewsList lang="zh" />
}
