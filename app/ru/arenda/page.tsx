import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllRental } from '@/lib/rental'
import { RentalCatalog } from './_catalog'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Помесячная аренда вилл и апартаментов на Бали | Balinsky',
  description: 'Виллы, апартаменты и дома в долгосрочную аренду на Бали — Чангу, Убуд, Семиньяк, Букит и другие районы. Подборка обновляется ежедневно.',
  alternates: { canonical: '/ru/arenda' },
}

export default async function RentalListPage() {
  const items = await loadAllRental()
  return (
    <>
      <Header active="arenda" />
      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          Помесячная аренда
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          Виллы и апартаменты в долгосрочную аренду — обновляется автоматически
        </div>

        <RentalCatalog items={items} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
