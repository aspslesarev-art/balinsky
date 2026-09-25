// Shared news-list shell for /ru/novosti and /en/news.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllNews } from '@/lib/news'
import { pickCopy, tField, switchLangPath, type Lang } from '@/lib/i18n'
import { hreflangMap } from '@/lib/hreflang'

const COPY = {
  ru: {
    title: 'Новости рынка недвижимости Бали | Balinsky',
    description: 'Что происходит на рынке недвижимости Бали: законы, туризм, инфраструктура, застройщики. Коротко, со ссылкой на источник и выводом для покупателя.',
    h1: 'Новости рынка недвижимости Бали',
    sub: (n: number) => `${n} ${n % 10 === 1 && n !== 11 ? 'новость' : n % 10 >= 2 && n % 10 <= 4 && (n < 10 || n > 20) ? 'новости' : 'новостей'}: рынок, законы и застройщики`,
    empty: 'Пока нет новостей.',
    archive: 'Архив новостей',
    locale: 'ru-RU',
  },
  en: {
    title: 'Bali Property Market News — Regulation, Tourism, Developers | Balinsky',
    description: 'What is happening in Bali property: regulation, tourism numbers, infrastructure and developers. Short, sourced, with what it means for buyers.',
    h1: 'Bali property market news',
    sub: (n: number) => `${n} ${n === 1 ? 'story' : 'stories'}: market, regulation and developers`,
    empty: 'No news yet.',
    archive: 'News archive',
    locale: 'en-GB',
  },
  id: {
    title: 'Berita pengembang Bali | Balinsky',
    description: 'Berita terbaru dari pengembang dan pasar properti Bali.',
    h1: 'Berita',
    sub: (n: number) => `${n} berita dari pengembang Bali`,
    empty: 'Belum ada berita.',
    archive: 'Arsip berita',
    locale: 'id-ID',
  },
  fr: {
    title: 'Actualités des promoteurs de Bali | Balinsky',
    description: 'Dernières actualités des promoteurs et du marché immobilier de Bali.',
    h1: 'Actualités',
    sub: (n: number) => `${n} ${n === 1 ? 'actualité' : 'actualités'} des promoteurs de Bali`,
    empty: 'Aucune actualité pour le moment.',
    archive: 'Archives',
    locale: 'fr-FR',
  },
  de: {
    title: 'News von Bali-Bauträgern | Balinsky',
    description: 'Aktuelle News von Bauträgern und über den Immobilienmarkt auf Bali.',
    h1: 'News',
    sub: (n: number) => `${n} ${n === 1 ? 'Meldung' : 'Meldungen'} von Bali-Bauträgern`,
    empty: 'Noch keine News.',
    archive: 'Archiv',
    locale: 'de-DE',
  },
  zh: {
    title: '巴厘岛开发商新闻 | Balinsky',
    description: '来自巴厘岛开发商及房地产市场的最新新闻。',
    h1: '新闻',
    sub: (n: number) => `${n} 条来自巴厘岛开发商的新闻`,
    empty: '暂无新闻。',
    archive: '新闻存档',
    locale: 'zh-CN',
  },
  nl: {
    title: 'Nieuws van Bali-ontwikkelaars | Balinsky',
    description: 'Laatste nieuws van ontwikkelaars en over de vastgoedmarkt op Bali.',
    h1: 'Nieuws',
    sub: (n: number) => `${n} ${n === 1 ? 'bericht' : 'berichten'} van Bali-ontwikkelaars`,
    empty: 'Nog geen nieuws.',
    archive: 'Archief',
    locale: 'nl-NL',
  },
  ban: {
    title: 'Berita pangwangun Bali | Balinsky',
    description: 'Berita anyar saking pangwangun lan indik pasar properti Bali.',
    h1: 'Berita',
    sub: (n: number) => `${n} berita saking pangwangun Bali`,
    empty: 'Durung wenten berita.',
    archive: 'Arsip orti',
    locale: 'id-ID',
  },
  pl: {
    title: 'Wiadomości deweloperów na Bali | Balinsky',
    description: 'Najnowsze wiadomości od deweloperów i o rynku nieruchomości na Bali.',
    h1: 'Wiadomości',
    sub: (n: number) => `${n} ${n === 1 ? 'wiadomość' : 'wiadomości'} od deweloperów na Bali`,
    empty: 'Brak wiadomości.',
    archive: 'Archiwum',
    locale: 'pl-PL',
  },
  uk: {
    title: 'Новини забудовників Балі | Balinsky',
    description: 'Свіжі новини від забудовників та про ринок нерухомості Балі.',
    h1: 'Новини',
    sub: (n: number) => `${n} ${n === 1 ? 'новина' : 'новин'} від забудовників Балі`,
    empty: 'Поки немає новин.',
    archive: 'Архів новин',
    locale: 'uk-UA',
  },
} as const

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

const CARD_LIMIT = 24

function archiveByMonth<T extends { date: string | null }>(list: T[], locale: string): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const n of list) {
    const d = n.date ? new Date(n.date) : null
    const key = d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
      : '—'
    groups.set(key, [...(groups.get(key) ?? []), n])
  }
  return [...groups.entries()]
}

export function generateNewsListMetadata(lang: Lang): Metadata {
  const c = pickCopy(COPY, lang)
  const ruPath = '/ru/novosti'
  const path = switchLangPath(ruPath, lang)
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: path,
      languages: hreflangMap(ruPath),
    },
  }
}

export async function NewsList({ lang }: { lang: Lang }) {
  // Newest first by date. The manifest keeps the admin's «На главной» items
  // on top, which buried the market news digest under older developer posts.
  const items = (await loadAllNews(lang)).slice().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const c = pickCopy(COPY, lang)
  const detailRoot = switchLangPath('/ru/novosti', lang)
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{c.h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">{c.sub(items.length)}</div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.slice(0, CARD_LIMIT).map(n => {
            const title = tField((n as unknown as { data?: Record<string, unknown> }).data ?? {}, 'title', lang) ?? n.title
            return (
              <li key={n.id}>
                <Link href={`${detailRoot}/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                  {n.photo ? (
                    <div className="relative w-full h-[180px]">
                      <Image src={n.photo} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-[180px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">📰</div>
                  )}
                  <div className="p-4">
                    {n.developers[0]?.name && (
                      <div className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1.5">
                        {n.developers[0].name}
                      </div>
                    )}
                    <div className="text-[16px] font-semibold leading-snug mb-2 line-clamp-3">{title}</div>
                    {fmtDate(n.date, c.locale) && (
                      <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDate(n.date, c.locale)}</div>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        {/* Older items as a compact dated list: every link stays crawlable,
            but 160+ photo cards (each with a srcset) no longer bloat the HTML. */}
        {items.length > CARD_LIMIT && (
          <section className="mt-16 max-w-[820px]">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-6">{c.archive}</h2>
            <div className="space-y-8">
              {archiveByMonth(items.slice(CARD_LIMIT), c.locale).map(([month, group]) => (
                <div key={month}>
                  <h3 className="text-[13px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{month}</h3>
                  <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                    {group.map(n => (
                      <li key={n.id}>
                        <Link href={`${detailRoot}/${n.slug}`} className="flex items-baseline gap-4 py-3 no-underline text-[#111827] hover:text-[var(--color-primary-pressed)]">
                          <span className="shrink-0 w-6 text-right text-[13px] tabular-nums text-[var(--color-text-muted)]">{n.date ? new Date(n.date).getUTCDate() : ''}</span>
                          <span className="text-[15px] leading-snug">{tField((n as unknown as { data?: Record<string, unknown> }).data ?? {}, 'title', lang) ?? n.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
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
