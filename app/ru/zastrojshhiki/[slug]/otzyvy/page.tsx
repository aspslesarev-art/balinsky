// Programmatic landing «Отзывы о застройщике X» — targets queries
// like «BREIG отзывы», «X bali developer reviews». Surfaces the
// developer's rating, completed-project count, manager video count
// and «report an error» link the SEO audit recommended. Heavy lifting
// is in lib/managers + raw_developers; this is presentation only.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, Building2, HardHat, MessageSquare, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { botLink } from '@/lib/bot-link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ slug: string }>

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

async function loadDeveloper(slug: string) {
  const { data } = await sb
    .from('raw_developers')
    .select('airtable_id, data, logo_url')
    .limit(200)
  const all = (data ?? []) as Array<{ airtable_id: string; data: Record<string, unknown>; logo_url: string | null }>
  return all.find(r => firstString(r.data['SEO:Slug']) === slug) ?? null
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const row = await loadDeveloper(slug)
  if (!row) return { robots: { index: false, follow: false } }
  const name = firstString(row.data['Developer']) ?? slug
  return {
    title: `Отзывы о застройщике ${name} на Бали — рейтинг, проекты, опыт | Balinsky`,
    description: `Отзывы и оценка работы застройщика ${name} на Бали: рейтинг по 4 направлениям, сданные и активные проекты, реальный опыт покупателей, контакт менеджера.`,
    alternates: {
      canonical: `/ru/zastrojshhiki/${slug}/otzyvy`,
      languages: {
        ru: `${SITE_URL}/ru/zastrojshhiki/${slug}/otzyvy`,
        en: `${SITE_URL}/en/developers/${slug}/reviews`,
        'x-default': `${SITE_URL}/ru/zastrojshhiki/${slug}/otzyvy`,
      },
    },
    openGraph: { title: `Отзывы о застройщике ${name}`, type: 'article' },
    twitter: { card: 'summary_large_image' },
  }
}

export const revalidate = 86400

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const row = await loadDeveloper(slug)
  if (!row) notFound()
  const d = row.data
  const name = firstString(d['Developer']) ?? slug

  const ratingRaw = firstString(d['Общий рейтинг'])
  const ratingNum = ratingRaw ? Number.parseFloat(ratingRaw) : NaN
  const rating = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : null
  const completed = firstString(d['Сданные проекты'])
  const active    = firstString(d['Активные проекты'])
  const review    = firstString(d['Telegram отзыв']) ?? firstString(d['WhatsApp отзыв'])

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/ru` },
      { '@type': 'ListItem', position: 2, name: 'Застройщики', item: `${SITE_URL}/ru/zastrojshhiki` },
      { '@type': 'ListItem', position: 3, name, item: `${SITE_URL}/ru/zastrojshhiki/${slug}` },
      { '@type': 'ListItem', position: 4, name: 'Отзывы' },
    ],
  }
  const aggregateJsonLd = rating ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: `${SITE_URL}/ru/zastrojshhiki/${slug}`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: rating,
      bestRating: '5',
      ratingCount: completed || '1',
    },
  } : null

  return (
    <>
      <Header active="zastrojshhiki" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Застройщики', href: '/ru/zastrojshhiki' },
          { label: name, href: `/ru/zastrojshhiki/${slug}` },
          { label: 'Отзывы' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827] mb-3 leading-tight">
            Отзывы о застройщике {name} на Бали
          </h1>
          <p className="text-[15px] text-[var(--color-text-muted)] mb-8 max-w-3xl">
            Сводная оценка работы застройщика — на основе проверки документов (PBG, SLF), портфолио сданных проектов, репутации в комьюнити агентов и фактических отзывов покупателей через @BalinskyBot.
          </p>

          <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {rating && (
              <div className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Рейтинг</span>
                </div>
                <div className="text-[24px] font-semibold text-[#111827]">{rating} <span className="text-[14px] text-[var(--color-text-muted)] font-normal">/ 5</span></div>
              </div>
            )}
            {completed && (
              <div className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 size={14} className="text-[var(--color-primary)]" />
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Сданные</span>
                </div>
                <div className="text-[24px] font-semibold text-[#111827]">{completed}</div>
              </div>
            )}
            {active && (
              <div className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <HardHat size={14} className="text-[var(--color-primary)]" />
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Активные</span>
                </div>
                <div className="text-[24px] font-semibold text-[#111827]">{active}</div>
              </div>
            )}
          </section>

          <section className="mb-10 space-y-3 text-[16px] leading-[1.7] text-[#1f2937]">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">Как мы оцениваем застройщика</h2>
            <p>
              Каждый застройщик в каталоге Balinsky проходит редакторский QA по 4 направлениям: <strong>качество строительства</strong> (PBG, SLF, реальный прогресс), <strong>репутация и опыт</strong> (сколько проектов сдано, отзывы агентов), <strong>техника и производство</strong> (поставщики, технологии), <strong>управляющая компания</strong> (наличие УК, фактическая загрузка после сдачи).
            </p>
            <p>
              Если хотите оставить отзыв о работе с {name} — напишите в @BalinskyBot, мы приобщим к рейтингу. Если знаете об ошибке в данных по застройщику или хотите запросить пояснение — также через бот.
            </p>
          </section>

          {review && (
            <section className="mb-10 rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <h2 className="text-[18px] font-semibold text-[#111827] mb-2 flex items-center gap-2">
                <MessageSquare size={18} className="text-[var(--color-primary)]" /> Реальный отзыв клиента
              </h2>
              <p className="text-[14px] leading-relaxed text-[#1f2937] whitespace-pre-wrap">{review}</p>
            </section>
          )}

          <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Что важно проверить перед сделкой</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>PBG (разрешение на строительство) на конкретный объект — не на застройщика «в целом»</li>
                  <li>SLF (сертификат пригодности к эксплуатации) на готовые юниты</li>
                  <li>Статус земли в RDTR (туристическая, не сельхоз)</li>
                  <li>Реальный срок лизхолда — минимум 30 лет на дату покупки</li>
                  <li>Опыт работы УК с конкретно этим типом объектов</li>
                </ul>
              </div>
            </div>
          </section>


          <section className="mb-10">
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Связанные разделы</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <li>
                <Link href={`/ru/zastrojshhiki/${slug}`} className="block px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                  Полная страница застройщика {name}
                </Link>
              </li>
              <li>
                <a href={botLink('manager', row.airtable_id)} target="_blank" rel="noopener" className="block px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                  Запросить отчёт по объектам {name}
                </a>
              </li>
              <li>
                <Link href="/ru/zastrojshhiki" className="block px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                  Все застройщики Бали
                </Link>
              </li>
              <li>
                <Link href="/ru/investicii-v-nedvizhimost-bali" className="block px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                  Гайд по инвестициям на Бали
                </Link>
              </li>
            </ul>
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        {aggregateJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateJsonLd) }} />
        )}
      </PageContainer>
      <Footer lang="ru" />
    </>
  )
}
