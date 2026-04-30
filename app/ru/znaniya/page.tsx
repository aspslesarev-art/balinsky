import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllKnowledge } from '@/lib/knowledge'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'База знаний — недвижимость, виза, жизнь на Бали | Balinsky',
  description: 'Полезные статьи о покупке недвижимости, лизхолде, налогах, ВНЖ и жизни на Бали.',
  alternates: { canonical: '/ru/znaniya' },
}

export default async function KnowledgeListPage() {
  const items = await loadAllKnowledge()
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          Знания
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">
          Полезные статьи о недвижимости, юридических нюансах и жизни на Бали
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(k => (
            <li key={k.id}>
              <Link href={`/ru/znaniya/${k.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                  {k.photo ? (
                    <img src={k.photo} alt={k.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📚</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[16px] font-semibold leading-snug line-clamp-3">{k.title}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            Пока нет статей.
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
