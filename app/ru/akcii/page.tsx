import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllPromo } from '@/lib/promo'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Акции и спецпредложения от застройщиков Бали | Balinsky',
  description: 'Скидки, рассрочки и спецпредложения от застройщиков на виллы и апартаменты Бали.',
  alternates: { canonical: '/ru/akcii' },
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}
function isExpired(iso: string | null): boolean {
  if (!iso) return false
  try { return new Date(iso).getTime() < Date.now() } catch { return false }
}

export default async function PromoListPage() {
  const items = await loadAllPromo()
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          Акции
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">
          Скидки, рассрочки и спецпредложения от застройщиков Бали
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(p => {
            const expired = isExpired(p.expiresAt)
            return (
              <li key={p.id}>
                <Link href={`/ru/akcii/${p.slug}`} className={`block rounded-2xl overflow-hidden border bg-white no-underline text-[#111827] transition-colors ${expired ? 'border-[var(--color-border)] opacity-70' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                  {p.photo ? (
                    <img src={p.photo} alt={p.title} className="w-full h-[180px] object-cover" />
                  ) : (
                    <div className="w-full h-[180px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">🎁</div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      {p.developers[0]?.name && (
                        <span className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium">
                          {p.developers[0].name}
                        </span>
                      )}
                      {expired && (
                        <span className="text-[10px] uppercase tracking-wide bg-[#E5E7EB] text-[#374151] px-1.5 py-0.5 rounded">завершена</span>
                      )}
                      {!expired && p.pinned && (
                        <span className="text-[10px] uppercase tracking-wide bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] px-1.5 py-0.5 rounded">топ</span>
                      )}
                    </div>
                    <div className="text-[16px] font-semibold leading-snug mb-2 line-clamp-3">{p.title}</div>
                    {fmtDate(p.expiresAt) && (
                      <div className="text-[12px] text-[var(--color-text-muted)]">До {fmtDate(p.expiresAt)}</div>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            Пока нет активных акций.
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
