import { MethodologyView, methodologyMetadata } from '@/components/market/MethodologyView'

export const revalidate = 86400

export const metadata = methodologyMetadata('pl')

export default function Page() {
  return <MethodologyView lang="pl" />
}
