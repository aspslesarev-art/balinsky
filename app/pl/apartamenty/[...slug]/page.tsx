import { makeHubPage } from '@/lib/hub-page'
import { apartmentHub } from '@/app/ru/apartamenty/_hub'

// Catalog hub, e.g. /pl/apartamenty/canggu — see lib/hub-page.tsx.
const hub = makeHubPage(apartmentHub, 'pl')

export const revalidate = 86400
export function generateStaticParams() { return [] }
export const generateMetadata = hub.generateMetadata
export default hub.Page
