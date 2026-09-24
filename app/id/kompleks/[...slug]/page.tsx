import { makeHubPage } from '@/lib/hub-page'
import { complexHub } from '@/app/ru/zhilye-kompleksy/_hub'

// Catalog hub, e.g. /id/kompleks/canggu — see lib/hub-page.tsx.
const hub = makeHubPage(complexHub, 'id')

export const revalidate = 86400
export function generateStaticParams() { return [] }
export const generateMetadata = hub.generateMetadata
export default hub.Page
