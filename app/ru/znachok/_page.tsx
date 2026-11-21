import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { BadgeEmbedCode } from '@/components/badge/BadgeEmbedCode'
import { loadDeveloper } from '../zastrojshhiki/[slug]/_detail'

// Значок «Listed on Balinsky.info» для сайтов застройщиков: код для вставки
// со ссылкой на страницу застройщика у нас (обратная ссылка для SEO).
// Страница только по прямой ссылке (/ru/znachok?dev=<slug>, /en/badge?dev=…):
// noindex, нет в меню и в sitemap.

const SITE = 'https://balinsky.info'
const BADGE_W = 164
const BADGE_H = 48
const ALT = 'Listed on Balinsky.info — Bali property for foreign buyers'

type BadgeLang = 'ru' | 'en'

const COPY = {
  ru: {
    title: 'Значок для сайта застройщика | Balinsky',
    description: 'Бесплатный значок «Listed on Balinsky.info» со ссылкой на страницу застройщика.',
    eyebrow: 'Для застройщиков',
    h1: (name: string) => `Значок Balinsky для сайта ${name}`,
    lead: 'Поставьте значок в подвал сайта или на страницу «О нас». Он ведёт на вашу страницу на Balinsky — покупатель видит, что проект есть в независимом каталоге с документами и данными. Значок бесплатный.',
    light: 'Светлый',
    lightHint: 'Для светлого фона',
    dark: 'Тёмный',
    darkHint: 'Для тёмного подвала',
    howTitle: 'Как поставить',
    how: (url: string): Array<[string, string]> => [
      ['Куда вставить', 'В подвал сайта, на страницу «О нас» или страницу проекта.'],
      ['Конструкторы', 'Tilda, WordPress, Wix и другие: добавьте блок «HTML-код» и вставьте скопированный код.'],
      ['Куда ведёт', url],
    ],
    questions: 'Вопросы —',
    notFoundH1: 'Значок для сайта застройщика',
    notFound: 'Не нашли застройщика по этой ссылке. Проверьте адрес или напишите нам —',
  },
  en: {
    title: 'Badge for developer websites | Balinsky',
    description: 'A free “Listed on Balinsky.info” badge linking to the developer’s page.',
    eyebrow: 'For developers',
    h1: (name: string) => `Balinsky badge for the ${name} website`,
    lead: 'Place the badge in your site footer or on the “About” page. It links to your page on Balinsky, so buyers see the project is listed in an independent catalogue with documents and data. The badge is free.',
    light: 'Light',
    lightHint: 'For a light background',
    dark: 'Dark',
    darkHint: 'For a dark footer',
    howTitle: 'How to add it',
    how: (url: string): Array<[string, string]> => [
      ['Where', 'In the site footer, on the “About” page or on a project page.'],
      ['Site builders', 'Tilda, WordPress, Wix and others: add an “HTML code” block and paste the copied code.'],
      ['Links to', url],
    ],
    questions: 'Questions —',
    notFoundH1: 'Badge for developer websites',
    notFound: 'We could not find a developer for this link. Check the address or write to us —',
  },
} as const

export function badgeMetadata(lang: BadgeLang): Metadata {
  return {
    title: COPY[lang].title,
    description: COPY[lang].description,
    robots: { index: false, follow: false, nocache: true },
  }
}

function devName(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return devName(v[0])
  return null
}

// Только опубликованные и не скрытые застройщики (loadDeveloper уже отсекает
// lib/hidden-developers). Любая ошибка загрузки — как «не найден», без падения.
async function findDeveloper(slug: string): Promise<{ slug: string; name: string } | null> {
  if (slug.length > 200 || !/^[\p{L}\p{N}._-]+$/u.test(slug)) return null
  try {
    const dev = await loadDeveloper(slug)
    if (!dev || dev.data['Публикация'] !== true) return null
    return { slug, name: devName(dev.data['Developer']) ?? slug }
  } catch (err) {
    console.error('[badge] developer lookup failed', err)
    return null
  }
}

function embedCode(slug: string, theme: 'light' | 'dark'): string {
  return `<a href="${SITE}/en/developers/${encodeURIComponent(slug)}?from=badge" target="_blank" rel="noopener"><img src="${SITE}/badges/listed-on-balinsky-${theme}.svg" alt="${ALT}" width="${BADGE_W}" height="${BADGE_H}"></a>`
}

export async function BadgePage({ lang, searchParams }: {
  lang: BadgeLang
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = COPY[lang]
  const raw = (await searchParams).dev
  const slug = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
  const dev = slug ? await findDeveloper(slug) : null

  if (!dev) {
    return (
      <>
        <Header />
        <PageContainer>
          <section className="max-w-[760px] pb-24 pt-8 md:pt-12">
            <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">{c.eyebrow}</div>
            <h1 className="mb-5 text-[28px] font-semibold leading-[1.15] tracking-tight text-[var(--color-text)] md:text-[40px]">{c.notFoundH1}</h1>
            <p className="text-[16px] leading-[1.7] text-[var(--color-text-muted)]">
              {c.notFound}{' '}
              <a href="mailto:i@balinsky.info" className="font-medium text-[var(--color-primary)]">i@balinsky.info</a>
            </p>
          </section>
        </PageContainer>
      </>
    )
  }

  const targetUrl = `${SITE}/en/developers/${encodeURIComponent(dev.slug)}`
  const variants = [
    { theme: 'light' as const, label: c.light, hint: c.lightHint, stage: 'bg-[var(--color-surface-alt)]' },
    { theme: 'dark' as const, label: c.dark, hint: c.darkHint, stage: 'bg-[#15201B]' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <section className="max-w-[760px] pb-10 pt-8 md:pb-12 md:pt-12">
          <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">{c.eyebrow}</div>
          <h1 className="mb-5 text-[28px] font-semibold leading-[1.15] tracking-tight text-[var(--color-text)] md:text-[40px]">{c.h1(dev.name)}</h1>
          <p className="text-[16px] leading-[1.7] text-[var(--color-text-muted)]">{c.lead}</p>
        </section>

        <section className="mb-16 grid grid-cols-1 gap-6 md:mb-24 md:grid-cols-2">
          {variants.map(v => (
            <div key={v.theme} className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">{v.label}</h2>
                <span className="text-[14px] text-[var(--color-text-muted)]">{v.hint}</span>
              </div>
              <div className={`flex h-32 items-center justify-center rounded-xl ${v.stage}`}>
                <a href={`/en/developers/${encodeURIComponent(dev.slug)}?from=badge`} target="_blank" rel="noopener" className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- статичный SVG, ровно то, что увидят на чужом сайте */}
                  <img src={`/badges/listed-on-balinsky-${v.theme}.svg`} alt={ALT} width={BADGE_W} height={BADGE_H} className="block" />
                </a>
              </div>
              <BadgeEmbedCode code={embedCode(dev.slug, v.theme)} lang={lang} />
            </div>
          ))}
        </section>

        <section className="mb-16 max-w-[760px] md:mb-24">
          <h2 className="mb-6 text-[24px] font-semibold tracking-tight text-[var(--color-text)] md:text-[28px]">{c.howTitle}</h2>
          <dl className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {c.how(targetUrl).map(([k, val]) => (
              <div key={k} className="grid grid-cols-1 gap-1 py-4 md:grid-cols-[200px_1fr] md:gap-6">
                <dt className="text-[14px] font-semibold text-[var(--color-text)]">{k}</dt>
                <dd className="break-words text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{val}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[14px] text-[var(--color-text-muted)]">
            {c.questions}{' '}
            <a href="mailto:i@balinsky.info" className="font-medium text-[var(--color-primary)]">i@balinsky.info</a>
          </p>
        </section>
      </PageContainer>
    </>
  )
}
