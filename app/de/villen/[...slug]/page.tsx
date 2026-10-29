import { makeHubPage } from '@/lib/hub-page'
import { villaHub } from '@/app/ru/villy/_hub'

// Catalog hub, e.g. /de/villen/canggu — see lib/hub-page.tsx.
const hub = makeHubPage(villaHub, 'de')

export const revalidate = 604800
export function generateStaticParams() { return [] }
export const generateMetadata = hub.generateMetadata
export default hub.Page
