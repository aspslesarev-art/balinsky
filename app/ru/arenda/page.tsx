import type { Metadata } from 'next'
import Link from 'next/link'
import { BedDouble, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllRental, type RentalItem } from '@/lib/rental'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Помесячная аренда вилл и апартаментов на Бали | Balinsky',
  description: 'Виллы, апартаменты и дома в долгосрочную аренду на Бали — Чангу, Убуд, Семиньяк, Букит и другие районы. Подборка обновляется ежедневно.',
  alternates: { canonical: '/ru/arenda' },
}

function fmtUsd(n: number): string { return '$' + Math.round(n).toLocaleString('en-US') }

export default async function RentalListPage() {
  const items = await loadAllRental()
  return (
    <>
      <Header active="arenda" />
      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          Помесячная аренда
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">
          Виллы и апартаменты в долгосрочную аренду — {items.length} {pluralRu(items.length, ['объект', 'объекта', 'объектов'])}
        </div>

        {items.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(r => (
              <li key={r.id}>
                <RentalCard r={r} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            Объекты в аренду подгружаются.
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}

function RentalCard({ r }: { r: RentalItem }) {
  const cover = r.photos[0]
  return (
    <Link
      href={`/ru/arenda/o/${r.slug}`}
      className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
        {cover ? (
          <img src={cover} alt={r.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🏡</div>
        )}
        {r.type && (
          <span className="absolute left-3 top-3 text-[11px] uppercase tracking-wide bg-white/95 backdrop-blur px-2 py-1 rounded-full font-medium">
            {r.type}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="text-[18px] font-semibold text-[#111827]">{fmtUsd(r.priceMonthUsd)}<span className="text-[12px] font-normal text-[var(--color-text-muted)]"> / мес</span></div>
          {r.bedrooms != null && (
            <div className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
              <BedDouble size={13} /> {r.bedrooms} BR
            </div>
          )}
        </div>
        <div className="text-[14px] font-medium leading-snug line-clamp-2 mb-2">{r.title}</div>
        {r.location && (
          <div className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
            <MapPin size={12} /> {r.location}
          </div>
        )}
      </div>
    </Link>
  )
}

function pluralRu(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1]
  return forms[2]
}
