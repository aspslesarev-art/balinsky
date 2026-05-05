// Shared knowledge-list shell for /ru/znaniya and /en/knowledge.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllKnowledge } from '@/lib/knowledge'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'База знаний — недвижимость, виза, жизнь на Бали | Balinsky',
    description: 'Полезные статьи о покупке недвижимости, лизхолде, налогах, ВНЖ и жизни на Бали.',
    h1: 'Знания',
    sub: 'Полезные статьи о недвижимости, юридических нюансах и жизни на Бали',
    empty: 'Пока нет статей.',
  },
  en: {
    title: 'Knowledge base — real estate, visas, life in Bali | Balinsky',
    description: 'Useful articles on buying real estate, leasehold, taxes, residency and life in Bali.',
    h1: 'Knowledge',
    sub: 'Useful articles on real estate, legal nuances and life in Bali',
    empty: 'No articles yet.',
  },
} as const

export function generateKnowledgeListMetadata(lang: Lang): Metadata {
  const c = COPY[lang]
  const ruPath = '/ru/znaniya'
  const enPath = '/en/knowledge'
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: path,
      languages: { ru: `https://balinsky.info${ruPath}`, en: `https://balinsky.info${enPath}` },
    },
  }
}

export async function KnowledgeList({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const items = await loadAllKnowledge()
  const detailRoot = lang === 'en' ? '/en/knowledge' : '/ru/znaniya'
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{c.h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">{c.sub}</div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(k => (
            <li key={k.id}>
              <Link href={`${detailRoot}/${k.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
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
            {c.empty}
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
