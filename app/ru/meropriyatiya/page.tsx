import { EventsList, generateEventsListMetadata } from './_page'

export const revalidate = 3600
export const metadata = generateEventsListMetadata('ru')

export default async function Page() {
  return <EventsList lang="ru" />
}
