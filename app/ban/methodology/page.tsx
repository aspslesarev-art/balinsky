import { MethodologyView, methodologyMetadata } from '@/components/market/MethodologyView'

export const revalidate = 604800

export const metadata = methodologyMetadata('ban')

export default function Page() {
  return <MethodologyView lang="ban" />
}
