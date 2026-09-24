import { makeHubPage } from '@/lib/hub-page'
import { complexHub } from '@/app/ru/zhilye-kompleksy/_hub'

// Catalog hub, e.g. /nl/wooncomplexen/canggu — see lib/hub-page.tsx.
const hub = makeHubPage(complexHub, 'nl')

export const revalidate = 86400
export function generateStaticParams() { return [] }
export const generateMetadata = hub.generateMetadata
export default hub.Page
