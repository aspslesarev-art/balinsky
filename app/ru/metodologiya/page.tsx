import { MethodologyView, methodologyMetadata } from '@/components/market/MethodologyView'

export const revalidate = 604800

export const metadata = methodologyMetadata('ru')

export default function Page() {
  return <MethodologyView lang="ru" />
}
