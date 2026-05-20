// Programmatic landing for «инвестиции в недвижимость <район>».
// 12 districts × 2 langs = 24 URLs targeting district-specific
// investment queries («инвестиции в недвижимость Чангу»,
// «bali property investment uluwatu»). Each page reuses the editorial
// district copy + the pillar's framework, narrowed to one location.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ChevronRight, AlertTriangle, MapPin, Calculator } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getDistrictCopy } from '@/lib/districts'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 мая 2026 г.'

type Params = Promise<{ district: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { district } = await params
  const copy = getDistrictCopy(district, 'ru')
  if (!copy) return { robots: { index: false, follow: false } }
  const priceFrom = copy.highlights.find(h => /стартовая|from/i.test(h.label))?.value
  const yieldR    = copy.highlights.find(h => /доходность|yield/i.test(h.label))?.value
  return {
    title: `Инвестиции в недвижимость ${copy.name}, Бали — доходность ${yieldR ?? ''}, цены ${priceFrom ?? ''} | Balinsky`,
    description: `Инвестировать в недвижимость в ${copy.name}, Бали — реальная доходность ${yieldR ?? '8-15%'} годовых, стартовая цена ${priceFrom ?? 'от $130K'}. Лизхолд, PT PMA, расчёт окупаемости.`,
    alternates: {
      canonical: `/ru/investicii/${district}`,
      languages: {
        ru: `${SITE_URL}/ru/investicii/${district}`,
        en: `${SITE_URL}/en/bali-property-investment/${district}`,
        'x-default': `${SITE_URL}/ru/investicii/${district}`,
      },
    },
    openGraph: {
      title: `Инвестиции в недвижимость ${copy.name}, Бали — гайд 2026`,
      description: `Доходность ${yieldR ?? '8-15%'}, цены ${priceFrom ?? 'от $130K'}, лизхолд и PT PMA.`,
      type: 'article',
      url: `/ru/investicii/${district}`,
    },
    twitter: { card: 'summary_large_image' },
  }
}

export const revalidate = 86400

export default async function Page({ params }: { params: Params }) {
  const { district } = await params
  const copy = getDistrictCopy(district, 'ru')
  if (!copy) notFound()

  const priceFrom = copy.highlights.find(h => /стартовая|from/i.test(h.label))?.value
  const yieldR    = copy.highlights.find(h => /доходность|yield/i.test(h.label))?.value
  const adr       = copy.highlights.find(h => /adr/i.test(h.label))?.value
  const occupancy = copy.highlights.find(h => /загрузка|occupancy/i.test(h.label))?.value

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/ru` },
      { '@type': 'ListItem', position: 2, name: 'Инвестиции в недвижимость на Бали', item: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali` },
      { '@type': 'ListItem', position: 3, name: copy.name },
    ],
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Инвестиции в недвижимость Бали', href: '/ru/investicii-v-nedvizhimost-bali' },
          { label: copy.name },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Инвестиции в недвижимость в {copy.name}, Бали — гайд 2026
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">{copy.hero}</p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Обновлено: {UPDATED}</p>
          </header>

          <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {copy.highlights.map(h => (
              <div key={h.label} className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
                <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{h.label}</div>
                <div className="text-[20px] font-semibold text-[#111827]">{h.value}</div>
              </div>
            ))}
          </section>

          <section className="mb-10 space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
            {copy.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </section>

          <section className="mb-10 rounded-2xl border border-[var(--color-border)] p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={20} className="text-[var(--color-primary)]" />
              <strong>Типовой кейс: 2BR-объект в {copy.name}</strong>
            </div>
            <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
              {priceFrom && <li>Стартовая цена: {priceFrom}</li>}
              {adr && <li>ADR (средняя ставка/ночь): {adr}</li>}
              {occupancy && <li>Загрузка через УК: {occupancy}</li>}
              {yieldR && <li>Доходность чистыми: {yieldR} годовых</li>}
              <li>Лизхолд 25-50 лет от частных владельцев; freehold через PT PMA у крупных застройщиков</li>
              <li>Срок окупаемости: 7-12 лет в зависимости от ценового сегмента и доходности</li>
            </ul>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Подробный расчёт на каждой странице виллы/апартаментов в этом районе — с реальными цифрами по соседям из <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
            </p>
          </section>

          <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Главные риски района</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Лизхолд короче 30 лет</strong> — не успеете отбить вложения и перепродать. Минимум 35 лет на дату покупки.</li>
                  <li><strong>Объект без SLF</strong> — нельзя легально сдавать в аренду, ROI-модель не работает.</li>
                  <li><strong>Зонирование RDTR</strong> — часть участков пересматривается. Сверять статус земли до сделки критично.</li>
                  <li><strong>«Гарантированная доходность» от застройщика</strong> завышена обычно на 30-50% — сверять с Booking-данными по соседям.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Подходит для</h2>
            <div className="flex flex-wrap gap-2">
              {copy.bestFor.map(tag => (
                <span key={tag} className="inline-block text-[14px] bg-white border border-[var(--color-border)] rounded-full px-4 py-2">{tag}</span>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Следующий шаг</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href={`/ru/villy/${district}`} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Виллы в {copy.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Каталог с фото, ценами и документами.</p>
              </Link>
              <Link href={`/ru/apartamenty/${district}`} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Апартаменты в {copy.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Юниты в ЖК с управляющей компанией.</p>
              </Link>
              <Link href={`/ru/zhilye-kompleksy/${district}`} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Жилые комплексы в {copy.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Off-plan и готовые проекты.</p>
              </Link>
              <Link href="/ru/investicii-v-nedvizhimost-bali" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1 inline-flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-[var(--color-primary)]" /> Общий гайд по инвестициям на Бали
                </h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Лизхолд, PT PMA, налоги — все районы.</p>
              </Link>
            </div>
          </section>

          <section className="mb-10 flex items-center gap-2 text-[14px] text-[var(--color-text-muted)]">
            <MapPin size={14} />
            Чтобы посмотреть район на карте — <Link href={`/ru/villy/${district}/karta`} className="text-[var(--color-primary)] no-underline hover:underline">карта вилл</Link>
            <ChevronRight size={14} />
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      </PageContainer>
      <Footer lang="ru" />
    </>
  )
}
