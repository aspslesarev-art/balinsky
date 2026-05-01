import type { Metadata } from 'next'
import { Suspense } from 'react'
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

type SP = Promise<Record<string, string | string[] | undefined>>

function parseList(v: string | string[] | undefined): string[] {
  if (v == null) return []
  return (Array.isArray(v) ? v : [v]).flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
}
function parseNum(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v
  if (!s) return null
  const n = Number(s.replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? n : null
}

export default async function RentalListPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const items = await loadAllRental()
  const initial = {
    districts: parseList(sp.location),
    bedrooms: parseList(sp.bedrooms),
    priceMin: parseNum(sp.priceMin),
    priceMax: parseNum(sp.priceMax),
  }
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

        <Suspense fallback={<div className="text-[14px] text-[var(--color-text-muted)]">Загрузка…</div>}>
          <RentalCatalog items={items} initial={initial} />
        </Suspense>

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
