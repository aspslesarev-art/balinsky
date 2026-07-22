// Cross-section linking block shown at the bottom of single-district
// catalog hubs (/ru/villy/canggu, /en/apartments/uluwatu, etc).
// Per audit feedback (TASK-06): every district page should send the
// visitor sideways into the developer / complex / promo / news
// listings filtered by the same district. Pure presentation — links
// only, no data fetching.

import Link from 'next/link'
import { ArrowRight, HardHat, Building2, Tag, Newspaper, TrendingUp } from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    heading: (district: string) => `Ещё про ${district}`,
    sub: 'Связанные разделы по этому району',
    devs: 'Застройщики в районе',
    complexes: 'Жилые комплексы',
    promo: 'Действующие акции',
    news: 'Новости района',
    pillar: 'Гид по инвестициям',
  },
  en: {
    heading: (district: string) => `More in ${district}`,
    sub: 'Related sections for this district',
    devs: 'Developers in the area',
    complexes: 'Residential complexes',
    promo: 'Active promotions',
    news: 'District news',
    pillar: 'Investment guide',
  },
  id: {
    heading: (district: string) => `Selengkapnya di ${district}`,
    sub: 'Bagian terkait untuk wilayah ini',
    devs: 'Pengembang di wilayah ini',
    complexes: 'Kompleks hunian',
    promo: 'Promo aktif',
    news: 'Berita wilayah',
    pillar: 'Panduan investasi',
  },
  fr: {
    heading: (district: string) => `Plus à ${district}`,
    sub: 'Sections liées à ce quartier',
    devs: 'Promoteurs de la zone',
    complexes: 'Résidences',
    promo: 'Promotions en cours',
    news: 'Actualités du quartier',
    pillar: 'Guide d’investissement',
  },
  de: {
    heading: (district: string) => `Mehr in ${district}`,
    sub: 'Verwandte Bereiche für diese Lage',
    devs: 'Bauträger in der Umgebung',
    complexes: 'Wohnanlagen',
    promo: 'Aktuelle Angebote',
    news: 'Neuigkeiten aus der Lage',
    pillar: 'Investitionsleitfaden',
  },
  zh: {
    heading: (district: string) => `更多${district}的内容`,
    sub: '该区域的相关板块',
    devs: '该区域的开发商',
    complexes: '住宅区',
    promo: '当前优惠',
    news: '区域资讯',
    pillar: '投资指南',
  },
  nl: {
    heading: (district: string) => `Meer in ${district}`,
    sub: 'Gerelateerde secties voor deze wijk',
    devs: 'Ontwikkelaars in de omgeving',
    complexes: 'Wooncomplexen',
    promo: 'Actieve aanbiedingen',
    news: 'Nieuws uit de wijk',
    pillar: 'Investeringsgids',
  },
  ban: {
    heading: (district: string) => `Sane lianan ring ${district}`,
    sub: 'Bagian sane matehan ring wewidangan puniki',
    devs: 'Pangwangun ring wewidangan',
    complexes: 'Kompleks hunian',
    promo: 'Promo sane kantun',
    news: 'Orti wewidangan',
    pillar: 'Panduan investasi',
  },
  pl: {
    heading: (district: string) => `Więcej w ${district}`,
    sub: 'Powiązane sekcje dla tego rejonu',
    devs: 'Deweloperzy w okolicy',
    complexes: 'Kompleksy mieszkaniowe',
    promo: 'Aktualne promocje',
    news: 'Wiadomości z rejonu',
    pillar: 'Przewodnik inwestycyjny',
  },
  uk: {
    heading: (district: string) => `Більше про ${district}`,
    sub: 'Пов’язані розділи щодо цього району',
    devs: 'Забудовники в районі',
    complexes: 'Житлові комплекси',
    promo: 'Чинні акції',
    news: 'Новини району',
    pillar: 'Гід з інвестицій',
  },
}

export function DistrictRelatedLinks({
  lang,
  districtName,
  districtSlug,
  currentKind = 'villa',
}: {
  lang: Lang
  districtName: string
  districtSlug: string
  // So we don't link back to the page the visitor is already on
  currentKind?: 'villa' | 'apartment' | 'complex'
}) {
  const c = pickCopy(COPY, lang)
  const devsHref     = switchLangPath('/ru/zastrojshhiki', lang)
  const complexesUrl = switchLangPath('/ru/zhilye-kompleksy', lang) + `/${districtSlug}`
  const villasUrl    = switchLangPath('/ru/villy', lang) + `/${districtSlug}`
  const aptsUrl      = switchLangPath('/ru/apartamenty', lang) + `/${districtSlug}`
  const promoHref    = switchLangPath('/ru/akcii', lang)
  const newsHref     = switchLangPath('/ru/novosti', lang)
  const pillarHref   = switchLangPath('/ru/investicii-v-nedvizhimost-bali', lang)

  const links = [
    { Icon: HardHat,    label: c.devs,      href: `${devsHref}?area=${districtSlug}` },
    currentKind !== 'complex'   ? { Icon: Building2,  label: c.complexes, href: complexesUrl } : null,
    currentKind !== 'villa'     ? { Icon: Building2,  label: lang === 'ru' ? 'Виллы' : 'Villas',          href: villasUrl } : null,
    currentKind !== 'apartment' ? { Icon: Building2,  label: lang === 'ru' ? 'Апартаменты' : 'Apartments', href: aptsUrl } : null,
    { Icon: Tag,        label: c.promo,     href: `${promoHref}?area=${districtSlug}` },
    { Icon: Newspaper,  label: c.news,      href: `${newsHref}?area=${districtSlug}` },
    { Icon: TrendingUp, label: c.pillar,    href: `${pillarHref}#${districtSlug}` },
  ].filter((x): x is { Icon: typeof HardHat; label: string; href: string } => x !== null)

  return (
    <section className="mt-12 mb-10">
      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-1">
        {c.heading(districtName)}
      </h2>
      <p className="text-[13px] text-[var(--color-text-muted)] mb-5">{c.sub}</p>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {links.map(l => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors"
            >
              <l.Icon size={16} className="text-[var(--color-primary)] shrink-0" />
              <span className="text-[14px] font-medium leading-tight">{l.label}</span>
              <ArrowRight size={14} className="ml-auto text-[var(--color-text-muted)] shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
