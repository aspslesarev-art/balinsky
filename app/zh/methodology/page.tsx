import { MethodologyView, methodologyMetadata } from '@/components/market/MethodologyView'

export const revalidate = 86400

export const metadata = methodologyMetadata('zh')

export default function Page() {
  return <MethodologyView lang="zh" />
}
