import { EventsList, generateEventsListMetadata } from '../../ru/meropriyatiya/_page'

export const revalidate = 3600
export const metadata = generateEventsListMetadata('de')

export default async function Page() {
  return <EventsList lang="de" />
}
