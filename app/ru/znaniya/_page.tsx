// Shared knowledge-list shell for /ru/znaniya and /en/knowledge.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllKnowledge, filterByAudience, type KnowledgeAudience } from '@/lib/knowledge'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    titleInvestor: 'База знаний для инвестора — недвижимость на Бали | Balinsky',
    titleAgent: 'База знаний для агента — работа с недвижимостью Бали | Balinsky',
    descInvestor: 'Полезные статьи об инвестициях в недвижимость Бали: налоги, leasehold, доходность, проверка застройщика.',
    descAgent: 'Гайды для зарубежных агентов и брокеров, которые продают недвижимость Бали: комиссии, юр-схема, привлечение клиентов.',
    h1Investor: 'Знания для инвестора',
    h1Agent: 'Знания для агента',
    subInvestor: 'Налоги, право, доходность, риски — что нужно знать перед покупкой',
    subAgent: 'Как зарубежному агенту работать с Бали: комиссии, схемы, инструменты, продажи',
    tabInvestor: 'Для инвестора',
    tabAgent: 'Для агента',
    empty: 'Пока нет статей в этом разделе.',
  },
  en: {
    titleInvestor: 'Knowledge base for investors — Bali real estate | Balinsky',
    titleAgent: 'Knowledge base for agents — working with Bali real estate | Balinsky',
    descInvestor: 'Useful guides for investing in Bali real estate: taxes, leasehold, yields, developer due diligence.',
    descAgent: 'Guides for foreign agents and brokers selling Bali property: commissions, legal setup, lead generation.',
    h1Investor: 'For investors',
    h1Agent: 'For agents',
    subInvestor: 'Taxes, law, yields, risks — what to know before you buy',
    subAgent: 'How a foreign agent can work the Bali market: commissions, schemes, tools, sales',
    tabInvestor: 'For investors',
    tabAgent: 'For agents',
    empty: 'No articles in this section yet.',
  },
} as const

function pickAudience(raw: string | string[] | undefined): KnowledgeAudience {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === 'agent' ? 'agent' : 'investor'
}

export function generateKnowledgeListMetadata(lang: Lang, audience: KnowledgeAudience = 'investor'): Metadata {
  const c = COPY[lang]
  const ruPath = audience === 'agent' ? '/ru/znaniya?for=agent' : '/ru/znaniya'
  const enPath = audience === 'agent' ? '/en/knowledge?for=agent' : '/en/knowledge'
  const path = lang === 'en' ? enPath : ruPath
  const title = audience === 'agent' ? c.titleAgent : c.titleInvestor
  const description = audience === 'agent' ? c.descAgent : c.descInvestor
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { ru: `https://balinsky.info${ruPath}`, en: `https://balinsky.info${enPath}`, 'x-default': `https://balinsky.info${ruPath}` },
    },
  }
}

export async function KnowledgeList({ lang, audience }: { lang: Lang; audience: KnowledgeAudience }) {
  const c = COPY[lang]
  const all = await loadAllKnowledge(lang)
  const items = filterByAudience(all, audience)
  const detailRoot = lang === 'en' ? '/en/knowledge' : '/ru/znaniya'
  const listRoot = detailRoot
  const h1 = audience === 'agent' ? c.h1Agent : c.h1Investor
  const sub = audience === 'agent' ? c.subAgent : c.subInvestor

  const pillBase = 'inline-flex items-center px-5 py-2 rounded-full text-[14px] font-medium no-underline transition-colors border'
  const pillActive = 'bg-[#111827] text-white border-[#111827]'
  const pillIdle = 'bg-white text-[#111827] border-[var(--color-border)] hover:border-[var(--color-primary)]'

  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">{sub}</div>
        <div className="flex gap-2 mb-8">
          <Link href={listRoot} className={`${pillBase} ${audience === 'investor' ? pillActive : pillIdle}`}>
            {c.tabInvestor}
          </Link>
          <Link href={`${listRoot}?for=agent`} className={`${pillBase} ${audience === 'agent' ? pillActive : pillIdle}`}>
            {c.tabAgent}
          </Link>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(k => (
            <li key={k.id}>
              <Link href={`${detailRoot}/${k.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                  {k.photo ? (
                    <Image src={k.photo} alt={k.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
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

export { pickAudience }
