import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllNews } from '@/lib/news'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Новости застройщиков Бали | Balinsky',
  description: 'Свежие новости от застройщиков и о рынке недвижимости Бали.',
  alternates: { canonical: '/ru/novosti' },
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

export default async function NewsListPage() {
  const items = await loadAllNews()
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          Новости
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">
          {items.length} {items.length % 10 === 1 && items.length !== 11 ? 'новость' : items.length % 10 >= 2 && items.length % 10 <= 4 && (items.length < 10 || items.length > 20) ? 'новости' : 'новостей'} от застройщиков Бали
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(n => (
            <li key={n.id}>
              <Link href={`/ru/novosti/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                {n.photo ? (
                  <img src={n.photo} alt={n.title} className="w-full h-[180px] object-cover" />
                ) : (
                  <div className="w-full h-[180px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">📰</div>
                )}
                <div className="p-4">
                  {n.developers[0]?.name && (
                    <div className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1.5">
                      {n.developers[0].name}
                    </div>
                  )}
                  <div className="text-[16px] font-semibold leading-snug mb-2 line-clamp-3">
                    {n.title}
                  </div>
                  {fmtDate(n.date) && (
                    <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDate(n.date)}</div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            Пока нет новостей.
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
