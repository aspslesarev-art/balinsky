// Shared promo-detail renderer.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, ExternalLink, Building2, HardHat } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageViewTracker } from '@/components/PageViewTracker'
import { loadAllPromo, loadPromoBySlug } from '@/lib/promo'
import { RelatedContent } from '@/components/RelatedContent'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const COPY = {
  ru: {
    home: 'Главная', promoCrumb: 'Акции',
    until: 'До', moreFrom: (n: string) => `Ещё акции от ${n}`,
    learnMore: 'Подробнее', locale: 'ru-RU',
  },
  en: {
    home: 'Home', promoCrumb: 'Promotions',
    until: 'Until', moreFrom: (n: string) => `More promotions from ${n}`,
    learnMore: 'Learn more', locale: 'en-GB',
  },
  id: {
    home: 'Beranda', promoCrumb: 'Promosi',
    until: 'Sampai', moreFrom: (n: string) => `Promosi lain dari ${n}`,
    learnMore: 'Selengkapnya', locale: 'id-ID',
  },
  fr: {
    home: 'Accueil', promoCrumb: 'Promotions',
    until: 'Jusqu’au', moreFrom: (n: string) => `Plus de promotions de ${n}`,
    learnMore: 'En savoir plus', locale: 'fr-FR',
  },
} as const

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export async function generatePromoDetailMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const p = await loadPromoBySlug(slug, lang)
  if (!p) return { robots: { index: false, follow: false } }
  const ruPath = `/ru/akcii/${p.slug}`
  const enPath = `/en/promo/${p.slug}`
  const path = switchLangPath(ruPath, lang)
  return {
    title: `${p.title} | Balinsky`,
    description: p.seoDescription ?? (p.body?.slice(0, 160) ?? p.title),
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: {
      title: p.title,
      description: p.seoDescription ?? undefined,
      images: p.photo ? [p.photo] : undefined,
    },
  }
}

export async function PromoDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const p = await loadPromoBySlug(slug, lang)
  if (!p) notFound()
  const home = switchLangPath('/ru', lang)
  const promoRoot = switchLangPath('/ru/akcii', lang)
  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)

  const all = await loadAllPromo(lang)
  const related = p.developers[0]?.slug
    ? all.filter(x => x.id !== p.id && x.developers.some(d => d.slug === p.developers[0].slug)).slice(0, 4)
    : []

  return (
    <>
      <Header />
      <PageViewTracker kind="promo" slug={slug} title={p.title} airtableId={p.id} lang={lang} />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.promoCrumb, href: promoRoot },
          { label: p.title },
        ]} />

        <article className="mt-4">
          <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[#111827] mb-4">
            {p.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--color-text-muted)] mb-6">
            {p.expiresAt && (
              <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {c.until} {fmtDate(p.expiresAt, c.locale)}</span>
            )}
            {p.developers[0] && (
              p.developers[0].slug ? (
                <Link href={`${developersRoot}/${p.developers[0].slug}`} className="inline-flex items-center gap-1.5 text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline">
                  <HardHat size={14} /> {p.developers[0].name}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5"><HardHat size={14} /> {p.developers[0].name}</span>
              )
            )}
            {p.complexNames[0] && (
              <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {p.complexNames[0]}</span>
            )}
          </div>

          {p.photo && (
            <div className="relative w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <Image src={p.photo} alt={p.title} fill sizes="(max-width: 768px) 100vw, 800px" priority className="object-cover" />
            </div>
          )}
          {p.body && (
            <div className="text-[16px] leading-[1.7] text-[var(--color-text)] whitespace-pre-wrap">{p.body}</div>
          )}
          {p.externalUrl && (
            <div className="mt-6">
              <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)]">
                <ExternalLink size={14} /> {c.learnMore}
              </a>
            </div>
          )}
        </article>

        <RelatedContent lang={lang} developers={p.developers} complexNames={p.complexNames} title={p.title} />

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">
              {c.moreFrom(p.developers[0].name)}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <li key={r.id}>
                  <Link href={`${promoRoot}/${r.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    {r.photo ? (
                      <div className="relative w-full h-[120px]">
                        <Image src={r.photo} alt={r.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-[120px] bg-[var(--color-search-bg)] flex items-center justify-center text-2xl">🎁</div>
                    )}
                    <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">{r.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
