import { NewsList, generateNewsListMetadata } from '../../ru/novosti/_page'

export const revalidate = 3600
export const metadata = generateNewsListMetadata('ban')

export default async function Page() {
  return <NewsList lang="ban" />
}
