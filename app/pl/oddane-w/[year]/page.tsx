import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ComplexCard, type ComplexCardData } from '@/components/ComplexCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const VALID_YEARS = new Set(['2023', '2024', '2025', '2026', '2027', '2028'])
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ year: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { year } = await params
  if (!VALID_YEARS.has(year)) return { robots: { index: false, follow: false } }
  return {
    title: `Kompleksy mieszkaniowe na Bali oddane w ${year} — zweryfikowane projekty | Balinsky`,
    description: `Kompleksy mieszkaniowe na Bali z rokiem oddania ${year}. Gotowe jednostki, realny harmonogram, pozwolenia PBG/SLF, kontakty do deweloperów.`,
    alternates: {
      canonical: `/pl/oddane-w/${year}`,
      languages: {
        ru: `${SITE_URL}/ru/sdano/${year}`,
        pl: `${SITE_URL}/pl/oddane-w/${year}`,
        'x-default': `${SITE_URL}/ru/sdano/${year}`,
      },
    },
    openGraph: { title: `Kompleksy mieszkaniowe na Bali oddane w ${year}`, type: 'website' },
    twitter: { card: 'summary_large_image' },
  }
}

export const revalidate = 86400

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

export default async function Page({ params }: { params: Params }) {
  const { year } = await params
  if (!VALID_YEARS.has(year)) notFound()

  const { data: rows } = await sb
    .from('raw_complexes')
    .select('airtable_id, data, slug, cover_url')
    .limit(500)

  const matched: (ComplexCardData & { id: string })[] = []
  for (const r of (rows ?? []) as Array<{ airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }>) {
    const y = firstString(r.data['Year of completion ']) ?? firstString(r.data['Year of completion'])
    if (y !== year) continue
    if (!r.slug) continue
    const name = firstString(r.data['Project'])
    if (!name) continue
    matched.push({
      id: r.airtable_id,
      slug: r.slug,
      name,
      location: firstString(r.data['Location 2']) ?? firstString(r.data['Location']),
      types: firstString(r.data['Типы юнитов']),
      permit: firstString(r.data['Разрешительные документы']),
      readiness: 100,
      coverUrl: r.cover_url,
      photos: [],
      photoCount: r.cover_url ? 1 : 0,
      villaPriceFrom: null, villaPriceTo: null,
      aptPriceFrom: null, aptPriceTo: null,
    })
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Kompleksy mieszkaniowe', item: `${SITE_URL}/pl/kompleksy` },
      { '@type': 'ListItem', position: 3, name: `Oddane w ${year}`, item: `${SITE_URL}/pl/oddane-w/${year}` },
    ],
  }

  const isPast = Number(year) < 2026

  return (
    <>
      <Header active="zhilye-kompleksy" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Strona główna', href: '/pl' },
          { label: 'Kompleksy mieszkaniowe', href: '/pl/kompleksy' },
          { label: `Oddane w ${year}` },
        ]} />

        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {isPast ? `Kompleksy mieszkaniowe na Bali oddane w ${year}` : `Kompleksy mieszkaniowe na Bali planowane na ${year}`}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {matched.length} {matched.length === 1 ? 'kompleks' : 'kompleksów'}
        </div>

        <section className="max-w-3xl mb-8 text-[15px] leading-[1.7] text-[#1f2937] space-y-3">
          <p>
            {isPast
              ? `Kompleksy mieszkaniowe na Bali, które ukończyły budowę w ${year}. Wszystkie jednostki przeszły odbiór końcowy, posiadają certyfikat SLF i mogą być legalnie wynajmowane lub zamieszkane.`
              : `Kompleksy mieszkaniowe na Bali z deklarowaną datą oddania ${year}. Niektóre projekty są na końcowym etapie budowy, inne wciąż na etapie off-plan. Zawsze weryfikuj rzeczywisty postęp z deklarowanym harmonogramem przed zawarciem transakcji.`}
          </p>
          <p>
            Każda karta kompleksu zawiera pozwolenia (PBG, SLF), zdjęcia i wideo z miejsca, informacje o deweloperze i kontakt do menedżera.
            Realna rentowność najmu na poziomie sąsiedztwa dzięki integracji z <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)] no-underline hover:underline">estatemarket.io</a>.
          </p>
        </section>

        {matched.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            Brak pasujących kompleksów. Przejrzyj <Link href="/pl/kompleksy" className="text-[var(--color-primary)] no-underline hover:underline">pełny katalog</Link>.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {matched.map(c => <ComplexCard key={c.id} c={c} lang="pl" />)}
          </div>
        )}

        <section className="mt-12 mb-8 max-w-3xl">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">Zobacz również</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[...VALID_YEARS].filter(y => y !== year).slice(0, 6).map(y => (
              <li key={y}>
                <Link href={`/pl/oddane-w/${y}`} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                  Kompleksy oddane w {y}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/pl/inwestycje-nieruchomosci-bali" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                Przewodnik inwestora nieruchomości na Bali
              </Link>
            </li>
          </ul>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
      <Footer lang="pl" />
    </>
  )
}
