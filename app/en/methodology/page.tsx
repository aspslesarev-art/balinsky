import { MethodologyView, methodologyMetadata } from '@/components/market/MethodologyView'

export const revalidate = 604800

export const metadata = methodologyMetadata('en')

export default function Page() {
  return <MethodologyView lang="en" />
}
