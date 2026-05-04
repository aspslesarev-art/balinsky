// Shared developer-catalog renderer used by both /ru/zastrojshhiki and
// /en/developers. Pass `lang` so layout / sort / data loading stay in
// one place; only the visible labels and metadata vary by locale.

import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { DevelopersList } from '@/components/DevelopersList'
import { DevelopersSeoContent } from '@/components/DevelopersSeoContent'
import { DevelopersSortToggle, type DevelopersSortKey } from '@/components/DevelopersSortToggle'
import type { DeveloperRowData } from '@/components/DeveloperRow'
import { scoreDeveloper, type ComplexStats } from '@/lib/developer-score'
import type { Lang } from '@/lib/i18n'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

type Row = { data: Record<string, unknown>; logo_url: string | null }

const COPY = {
  ru: {
    h1: 'Застройщики на Бали',
    count: (n: number) => `${n} компаний в каталоге`,
    intro: 'На странице собраны застройщики и девелоперы Бали с действующими проектами — виллами, апартаментами и жилыми комплексами. По каждой компании показан рейтинг по четырём направлениям: качество строительства и недвижимости, репутация и опыт, техника и производство, управляющая компания после ввода.',
    sortHint: 'Переключайте сортировку под свой критерий: сбалансированный рейтинг учитывает всё разом, «Сданные ЖК» показывают тех, кто реально достроил, «Активные стройки» — кто сейчас работает, «Опыт и репутация» — насыщенность данных о компании.',
  },
  en: {
    h1: 'Developers in Bali',
    count: (n: number) => `${n} companies in the catalogue`,
    intro: 'A directory of Bali developers with active projects — villas, apartments and residential complexes. Each company is rated across four dimensions: construction and real-estate quality, reputation and experience, equipment and production, and post-handover management.',
    sortHint: 'Pick the sort that matches your priority: the balanced score blends everything, “Completed projects” shows who has actually delivered, “Active projects” reveals who’s building right now, and “Experience” reflects how much editorial data we have on the company.',
  },
} as const

function logoFromJson(data: Record<string, unknown>): string | null {
  const arr = data['Logo']
  if (Array.isArray(arr) && arr[0] && typeof arr[0] === 'object' && 'url' in arr[0]) {
    const url = (arr[0] as { url: unknown }).url
    return typeof url === 'string' ? url : null
  }
  return null
}

function asText(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return asText(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return asText((v as Record<string, unknown>).value)
  return null
}

function richnessLen(v: unknown): number {
  if (!v) return 0
  if (typeof v === 'string') return v.trim().length
  if (typeof v === 'number') return String(v).length
  if (Array.isArray(v) && v.length) return richnessLen(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return richnessLen((v as Record<string, unknown>).value)
  return 0
}

// Pull the EN translation if the lang is 'en' and the column is filled.
// Otherwise fall back to the RU value silently — bullets coming from
// translatable Airtable fields shouldn't render as the placeholder
// because the row already shows a "no data" italic line for empty
// values, and a giant column-name string would be far worse.
function txt(data: Record<string, unknown>, key: string, lang: Lang): string | null {
  if (lang === 'en') {
    const en = asText(data[`${key} EN`])
    if (en) return en
  }
  return asText(data[key])
}

export async function DevelopersCatalog({
  sort,
  lang = 'ru',
}: {
  sort: DevelopersSortKey
  lang?: Lang
}) {
  const copy = COPY[lang]
  const [{ data: devData }, { data: complexData }] = await Promise.all([
    sb.from('raw_developers').select('data, logo_url').limit(200),
    sb.from('raw_complexes').select('data').limit(2000),
  ])

  const rows = (devData ?? []) as Row[]
  const canonicalize = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
  const statsByDev = new Map<string, ComplexStats>()
  for (const cr of (complexData ?? []) as { data: Record<string, unknown> }[]) {
    const dev = (cr.data['Developer1'] ?? '').toString().trim()
    if (!dev) continue
    const status = (cr.data['Статус'] ?? cr.data['Готовность'] ?? '').toString()
    const key = canonicalize(dev)
    const cur = statsByDev.get(key) ?? { total: 0, ready: 0 }
    cur.total += 1
    if (/(построен|сдан|готов|complet)/i.test(status)) cur.ready += 1
    statsByDev.set(key, cur)
  }

  const enriched = rows
    .filter(r => r.data['Публикация'] === true && r.data['SEO:Slug'] && r.data['Developer'])
    .map(r => {
      const name = String(r.data['Developer'])
      const stats = statsByDev.get(canonicalize(name)) ?? { total: 0, ready: 0 }
      const construction = txt(r.data, 'Строительство и недвижимость', lang)
      const reputation = txt(r.data, 'Репутация и опыт', lang)
      const equipment = txt(r.data, 'Техника и производство', lang)
      const management = txt(r.data, 'Управляющая компания', lang)
      const team = asText(r.data['Команда'])
      const business = asText(r.data['Бизнес и сервисы'])
      const yieldText = asText(r.data['Доходность'])
      const score = scoreDeveloper(stats, { construction, reputation, equipment, management, team, business, yieldText })
      const expScore =
        richnessLen(r.data['Репутация и опыт']) +
        richnessLen(r.data['Строительство и недвижимость']) +
        richnessLen(r.data['Техника и производство']) +
        richnessLen(r.data['Команда'])
      const intlRankRaw = Number(r.data['Опыт вне бали №'] ?? 0)
      const intlRank = Number.isFinite(intlRankRaw) && intlRankRaw > 0 ? intlRankRaw : null
      return { r, name, stats, score, expScore, intlRank, construction, reputation, equipment, management }
    })

  enriched.sort((a, b) => {
    if (sort === 'ready')      return b.stats.ready - a.stats.ready || b.score - a.score
    if (sort === 'inprogress') {
      const aIp = a.stats.total - a.stats.ready
      const bIp = b.stats.total - b.stats.ready
      return bIp - aIp || b.score - a.score
    }
    if (sort === 'experience') return b.expScore - a.expScore || b.score - a.score
    if (sort === 'international') {
      if (a.intlRank == null && b.intlRank == null) return b.score - a.score
      if (a.intlRank == null) return 1
      if (b.intlRank == null) return -1
      return a.intlRank - b.intlRank
    }
    return b.score - a.score
  })

  const items: DeveloperRowData[] = enriched.map(({ r, name, stats, construction, reputation, equipment, management }) => ({
    slug: String(r.data['SEO:Slug'] ?? '') || null,
    name,
    logoUrl: r.logo_url ?? logoFromJson(r.data),
    construction,
    reputation,
    equipment,
    management,
    complexesReady: stats.ready,
    complexesTotal: stats.total,
  }))

  return (
    <>
      <Header active="zastrojshhiki" />
      <PageContainer>
        <h1 className="pt-12 text-[26px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)] mb-3">
          {copy.h1}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
          {copy.count(items.length)}
        </div>

        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] mb-3">
          {copy.intro}
        </p>
        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text-muted)] mb-6">
          {copy.sortHint}
        </p>

        <Suspense fallback={null}>
          <DevelopersSortToggle current={sort} lang={lang} />
        </Suspense>

        <DevelopersList items={items} lang={lang} />

        <DevelopersSeoContent />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}

export function parseSort(v: string | string[] | undefined): DevelopersSortKey {
  const s = Array.isArray(v) ? v[0] : v
  if (s === 'ready' || s === 'inprogress' || s === 'experience' || s === 'international') return s
  return 'balanced'
}
