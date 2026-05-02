import Link from 'next/link'
import { ChevronRight, BedDouble, MapPin } from 'lucide-react'
import { loadAllRental, type RentalItem } from '@/lib/rental'
import { InlinePrice } from './InlinePrice'

type Props = {
  district: string | null
  bedrooms: number | null
  villaPriceUsd: number | null
}
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

export async function RentalCompareSection({ district, bedrooms, villaPriceUsd }: Props) {
  if (!district) return null
  const all = await loadAllRental()
  const { matches, level } = pickMatches(all, district, bedrooms)
  if (matches.length === 0) return null

  const prices = matches.map(r => r.priceMonthUsd).filter(Boolean)
  const med = median(prices)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const annualYieldPct = villaPriceUsd != null && villaPriceUsd > 0 && med > 0
    ? (med * 12) / villaPriceUsd * 100
    : null

  // Cheapest first — readers usually anchor on lower bound for "сколько в среднем стоит"
  const cards = [...matches].sort((a, b) => a.priceMonthUsd - b.priceMonthUsd).slice(0, 6)

  const subtitle = (() => {
    const n = matches.length
    const word = pluralRu(n, ['объект', 'объекта', 'объектов'])
    const brSuffix =
      bedrooms == null ? ''
      : level === 'exact' ? ` · ${bedrooms} BR`
      : level === 'pm1'   ? ` · ${Math.max(1, bedrooms - 1)}–${bedrooms + 1} BR`
      : ` · все спальни`
    return `${n} ${word} в районе ${district}${brSuffix}`
  })()

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827]">
          Что сдаётся по соседству на месяц
        </h2>
        <Link
          href={`/ru/arenda?location=${encodeURIComponent(district)}${bedrooms != null ? `&bedrooms=${bedrooms}` : ''}`}
          className="text-[13px] text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] inline-flex items-center gap-1 no-underline"
        >
          Все объекты в районе <ChevronRight size={14} />
        </Link>
      </div>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-5">{subtitle}</div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Stat label="Медианная аренда" value={<><InlinePrice usd={med} /> / мес</>} />
        <Stat label="Диапазон" value={<><InlinePrice usd={min} /> – <InlinePrice usd={max} /></>} />
        <Stat
          label={annualYieldPct != null ? 'Брутто-доходность' : 'За год'}
          value={annualYieldPct != null ? `~${annualYieldPct.toFixed(1)}%` : <><InlinePrice usd={med * 12} /> / год</>}
          hint={annualYieldPct != null ? <><InlinePrice usd={med * 12} /> в год от цены виллы <InlinePrice usd={villaPriceUsd ?? 0} /></> : undefined}
        />
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(r => <li key={r.id}><CompareCard r={r} /></li>)}
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

function CompareCard({ r }: { r: RentalItem }) {
  const cover = r.photos[0]
  return (
    <Link
      href={`/ru/arenda/o/${r.slug}`}
      className="block rounded-xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
        {cover ? (
          <img src={cover} alt={r.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🏡</div>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-[14px] font-semibold text-[#111827] leading-tight">
          <InlinePrice usd={r.priceMonthUsd} /><span className="text-[10px] font-normal text-[var(--color-text-muted)]"> / мес</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          {r.bedrooms != null && <span className="inline-flex items-center gap-0.5"><BedDouble size={10} /> {r.bedrooms} BR</span>}
          {r.location && <span className="inline-flex items-center gap-0.5 truncate"><MapPin size={10} /> {r.location}</span>}
        </div>
      </div>
    </Link>
  )
}
