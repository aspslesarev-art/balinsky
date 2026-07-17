import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, BedDouble, MapPin } from 'lucide-react'
import { loadCompareRental, type RentalItem } from '@/lib/rental'
import { InlinePrice } from './InlinePrice'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

type Props = {
  district: string | null
  bedrooms: number | null
  villaPriceUsd: number | null
  lang?: Lang
}

const COPY = {
  ru: {
    heading: 'Что сдаётся по соседству на месяц',
    allInArea: 'Все объекты в районе',
    perMonth: ' / мес',
    medianRent: 'Медианная аренда',
    range: 'Диапазон',
    grossYield: 'Брутто-доходность',
    perYear: 'За год',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} в год от цены виллы {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) => {
      const word = pluralRu(n, ['объект', 'объекта', 'объектов'])
      return `${n} ${word} в районе ${district}${brSuffix}`
    },
    allBedrooms: ' · все спальни',
    rentalRoot: '/ru/arenda',
  },
  en: {
    heading: 'What rents nearby per month',
    allInArea: 'All listings in this district',
    perMonth: ' / mo',
    medianRent: 'Median rent',
    range: 'Range',
    grossYield: 'Gross yield',
    perYear: 'Per year',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} per year on a villa priced {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) =>
      `${n} listing${n === 1 ? '' : 's'} in ${district}${brSuffix}`,
    allBedrooms: ' · any bedrooms',
    rentalRoot: '/en/rental',
  },
  id: {
    heading: 'Yang disewakan di sekitar per bulan',
    allInArea: 'Semua objek di area ini',
    perMonth: ' / bln',
    medianRent: 'Sewa median',
    range: 'Rentang',
    grossYield: 'Imbal hasil bruto',
    perYear: 'Per tahun',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} per tahun dari harga vila {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) =>
      `${n} objek di ${district}${brSuffix}`,
    allBedrooms: ' · semua kamar tidur',
    rentalRoot: '/id/sewa',
  },
  fr: {
    heading: 'Locations mensuelles à proximité',
    allInArea: 'Tous les biens de ce quartier',
    perMonth: ' / mois',
    medianRent: 'Loyer médian',
    range: 'Fourchette',
    grossYield: 'Rendement brut',
    perYear: 'Par an',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} par an sur une villa au prix de {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) =>
      `${n} bien${n === 1 ? '' : 's'} à ${district}${brSuffix}`,
    allBedrooms: ' · toutes chambres',
    rentalRoot: '/fr/location',
  },
  de: {
    heading: 'Was in der Nähe monatlich vermietet wird',
    allInArea: 'Alle Angebote in diesem Gebiet',
    perMonth: ' / Mon.',
    medianRent: 'Median-Miete',
    range: 'Spanne',
    grossYield: 'Bruttorendite',
    perYear: 'Pro Jahr',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} pro Jahr bei einem Villenpreis von {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) =>
      `${n} ${n === 1 ? 'Angebot' : 'Angebote'} in ${district}${brSuffix}`,
    allBedrooms: ' · alle Schlafzimmer',
    rentalRoot: '/de/miete',
  },
  zh: {
    heading: '附近每月出租的房源',
    allInArea: '该区域的所有房源',
    perMonth: ' / 月',
    medianRent: '租金中位数',
    range: '区间',
    grossYield: '毛收益率',
    perYear: '每年',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} 每年，别墅价格为 {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) =>
      `${district} 的 ${n} 套房源${brSuffix}`,
    allBedrooms: ' · 所有卧室',
    rentalRoot: '/zh/zulin',
  },
  nl: {
    heading: 'Wat in de buurt per maand wordt verhuurd',
    allInArea: 'Alle objecten in dit gebied',
    perMonth: ' / mnd',
    medianRent: 'Mediane huur',
    range: 'Bereik',
    grossYield: 'Brutorendement',
    perYear: 'Per jaar',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} per jaar op een villa met een prijs van {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) =>
      `${n} ${n === 1 ? 'object' : 'objecten'} in ${district}${brSuffix}`,
    allBedrooms: ' · alle slaapkamers',
    rentalRoot: '/nl/huur',
  },
  ban: {
    heading: 'Sane kasewaang ring sisi nyabran bulan',
    allInArea: 'Sami objek ring wewengkon puniki',
    perMonth: ' / bln',
    medianRent: 'Sewa median',
    range: 'Rentang',
    grossYield: 'Asil bruto',
    perYear: 'Nyabran warsa',
    yieldHint: (annual: React.ReactNode, price: React.ReactNode) => (
      <>{annual} nyabran warsa saking aji vila {price}</>
    ),
    subtitle: (n: number, district: string, brSuffix: string) =>
      `${n} objek ring ${district}${brSuffix}`,
    allBedrooms: ' · sami kamar',
    rentalRoot: '/ban/sewa',
  },
} as const

function pluralRu(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1]
  return forms[2]
}
function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function pickMatches(items: RentalItem[], district: string, bedrooms: number | null): { matches: RentalItem[]; level: 'exact' | 'pm1' | 'district-any' } {
  const sameDistrict = items.filter(r => r.location && r.location.toLowerCase() === district.toLowerCase())
  if (bedrooms == null) return { matches: sameDistrict, level: 'district-any' }
  const exact = sameDistrict.filter(r => r.bedrooms === bedrooms)
  if (exact.length >= 3) return { matches: exact, level: 'exact' }
  const pm1 = sameDistrict.filter(r => r.bedrooms != null && Math.abs(r.bedrooms - bedrooms) <= 1)
  if (pm1.length >= 3) return { matches: pm1, level: 'pm1' }
  if (sameDistrict.length >= 3) return { matches: sameDistrict, level: 'district-any' }
  return { matches: pm1.length >= exact.length ? pm1 : exact, level: pm1.length >= exact.length ? 'pm1' : 'exact' }
}

export async function RentalCompareSection({ district, bedrooms, villaPriceUsd, lang = 'ru' }: Props) {
  if (!district) return null
  const all = await loadCompareRental(lang)
  const { matches, level } = pickMatches(all, district, bedrooms)
  if (matches.length === 0) return null
  const c = pickCopy(COPY, lang)

  const prices = matches.map(r => r.priceMonthUsd).filter(Boolean)
  const med = median(prices)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const annualYieldPct = villaPriceUsd != null && villaPriceUsd > 0 && med > 0
    ? (med * 12) / villaPriceUsd * 100
    : null

  const cards = [...matches].sort((a, b) => a.priceMonthUsd - b.priceMonthUsd).slice(0, 6)

  const brSuffix =
    bedrooms == null ? ''
    : level === 'exact' ? ` · ${bedrooms} BR`
    : level === 'pm1'   ? ` · ${Math.max(1, bedrooms - 1)}–${bedrooms + 1} BR`
    : c.allBedrooms
  const subtitle = c.subtitle(matches.length, district, brSuffix)

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827]">
          {c.heading}
        </h2>
        <Link
          href={`${c.rentalRoot}?location=${encodeURIComponent(district)}${bedrooms != null ? `&bedrooms=${bedrooms}` : ''}`}
          className="text-[13px] text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] inline-flex items-center gap-1 no-underline"
        >
          {c.allInArea} <ChevronRight size={14} />
        </Link>
      </div>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-5">{subtitle}</div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5" data-investment-block>
        <Stat label={c.medianRent} value={<><InlinePrice usd={med} lang={lang} />{c.perMonth}</>} />
        <Stat label={c.range} value={<><InlinePrice usd={min} lang={lang} /> – <InlinePrice usd={max} lang={lang} /></>} />
        <Stat
          label={annualYieldPct != null ? c.grossYield : c.perYear}
          value={annualYieldPct != null ? `~${annualYieldPct.toFixed(1)}%` : <><InlinePrice usd={med * 12} lang={lang} /> / {lang === 'ru' ? 'год' : 'yr'}</>}
          hint={annualYieldPct != null ? c.yieldHint(<InlinePrice usd={med * 12} lang={lang} />, <InlinePrice usd={villaPriceUsd ?? 0} lang={lang} />) : undefined}
        />
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(r => <li key={r.id}><CompareCard r={r} lang={lang} /></li>)}
      </ul>
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">{label}</div>
      <div className="text-[20px] font-semibold text-[#111827]">{value}</div>
      {hint && <div className="text-[11px] text-[var(--color-text-muted)] mt-1">{hint}</div>}
    </div>
  )
}

function CompareCard({ r, lang }: { r: RentalItem; lang: Lang }) {
  const cover = r.photos[0]
  const root = switchLangPath('/ru/arenda', lang)
  const perMo = lang === 'ru' ? ' / мес' : ' / mo'
  return (
    <Link
      href={`${root}/o/${r.slug}`}
      target="_blank"
      rel="noopener"
      className="block rounded-xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
        {cover ? (
          <Image src={cover} alt={r.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🏡</div>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-[14px] font-semibold text-[#111827] leading-tight">
          <InlinePrice usd={r.priceMonthUsd} lang={lang} /><span className="text-[10px] font-normal text-[var(--color-text-muted)]">{perMo}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          {r.bedrooms != null && <span className="inline-flex items-center gap-0.5"><BedDouble size={10} /> {r.bedrooms} BR</span>}
          {r.location && <span className="inline-flex items-center gap-0.5 truncate"><MapPin size={10} /> {r.location}</span>}
        </div>
      </div>
    </Link>
  )
}
