// "Рынок краткосрочной аренды поблизости" — compact comparables block
// fed from estatemarket.io. Always renders the segment cards directly
// (no collapse) — the segment data is what makes the block worth
// showing in the first place. Renders nothing when both villa_count
// and apartment_count are 0.

import { TrendingUp, Hotel, Home as HomeIcon, ExternalLink } from 'lucide-react'
import type { ComplexMarketStats } from '@/lib/complex-market-stats'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'Почём сдают соседи',
    subtitle: 'По данным estatemarket.io — все объекты на Booking в радиусе 1 км',
    villas: 'Виллы',
    apartments: 'Апартаменты',
    listings: 'на Booking',
    adr: 'Средняя цена за ночь',
    adrHint: 'Сколько в среднем платит гость за ночь (ADR — Average Daily Rate).',
    annual: 'Сценарий: выручка за год при 65%',
    annualHint: 'Цена за ночь × 365 × 65%. Это сценарий, а не факт: надёжных данных о загрузке на Бали нет. До расходов на площадки, управление и налоги.',
    range: 'при 55–75%: ',
    sourceTitle: 'Источник',
    estateMarket: 'estatemarket.io',
    none: 'нет данных в радиусе',
    fewData: 'мало данных',
    total: (n: number) => `${n} ${n === 1 ? 'объект' : n < 5 ? 'объекта' : 'объектов'} в радиусе 1 км`,
  },
  en: {
    title: 'What neighbours charge',
    subtitle: 'From estatemarket.io — every Booking listing within 1 km',
    villas: 'Villas',
    apartments: 'Apartments',
    listings: 'on Booking',
    adr: 'Average price per night',
    adrHint: 'What a guest typically pays for one night (ADR — Average Daily Rate).',
    annual: 'Scenario: gross a year at 65%',
    annualHint: 'Nightly price × 365 × 65%. A scenario, not a fact: reliable occupancy data for Bali does not exist. Before platform fees, management and tax.',
    range: 'at 55–75%: ',
    sourceTitle: 'Source',
    estateMarket: 'estatemarket.io',
    none: 'no listings in radius',
    fewData: 'too few',
    total: (n: number) => `${n} listing${n === 1 ? '' : 's'} within 1 km`,
  },
  id: {
    title: 'Berapa penghasilan tetangga',
    subtitle: 'Menurut data estatemarket.io — semua properti di Booking dalam radius 1 km',
    villas: 'Vila',
    apartments: 'Apartemen',
    listings: 'di Booking',
    adr: 'Harga rata-rata per malam',
    adrHint: 'Berapa yang biasanya dibayar tamu untuk satu malam (ADR — Average Daily Rate).',
    annual: 'Skenario: setahun dengan okupansi 65%',
    annualHint: 'Harga per malam × 365 × 65%. Ini skenario, bukan fakta: data okupansi Bali yang andal tidak tersedia. Sebelum biaya platform, pengelolaan, dan pajak.',
    range: 'pada 55–75%: ',
    sourceTitle: 'Sumber',
    estateMarket: 'estatemarket.io',
    none: 'tidak ada data dalam radius',
    fewData: 'terlalu sedikit',
    total: (n: number) => `${n} properti dalam radius 1 km`,
  },
  fr: {
    title: 'Ce que gagnent les voisins',
    subtitle: 'D’après estatemarket.io — tous les biens sur Booking dans un rayon de 1 km',
    villas: 'Villas',
    apartments: 'Appartements',
    listings: 'sur Booking',
    adr: 'Prix moyen par nuit',
    adrHint: 'Ce qu’un client paie habituellement pour une nuit (ADR — Average Daily Rate).',
    annual: 'Scénario : une année à 65 % d’occupation',
    annualHint: 'Prix par nuit × 365 × 65 %. Un scénario, pas un fait : il n’existe pas de données fiables d’occupation à Bali. Avant commissions, gestion et impôts.',
    range: 'à 55–75 % : ',
    sourceTitle: 'Source',
    estateMarket: 'estatemarket.io',
    none: 'aucune annonce dans le rayon',
    fewData: 'trop peu',
    total: (n: number) => `${n} bien${n === 1 ? '' : 's'} dans un rayon de 1 km`,
  },
  de: {
    title: 'Was Nachbarn verdienen',
    subtitle: 'Laut estatemarket.io — alle Booking-Angebote im Umkreis von 1 km',
    villas: 'Villen',
    apartments: 'Apartments',
    listings: 'auf Booking',
    adr: 'Durchschnittspreis pro Nacht',
    adrHint: 'Was ein Gast typischerweise für eine Nacht zahlt (ADR — Average Daily Rate).',
    annual: 'Szenario: ein Jahr bei 65 % Auslastung',
    annualHint: 'Preis pro Nacht × 365 × 65 %. Ein Szenario, keine Tatsache: verlässliche Auslastungsdaten für Bali gibt es nicht. Vor Plattformgebühren, Verwaltung und Steuern.',
    range: 'bei 55–75 %: ',
    sourceTitle: 'Quelle',
    estateMarket: 'estatemarket.io',
    none: 'keine Angebote im Umkreis',
    fewData: 'zu wenige',
    total: (n: number) => `${n} ${n === 1 ? 'Angebot' : 'Angebote'} im Umkreis von 1 km`,
  },
  zh: {
    title: '邻居赚多少',
    subtitle: '数据来自 estatemarket.io — 1 公里范围内所有 Booking 房源',
    villas: '别墅',
    apartments: '公寓',
    listings: '在 Booking 上',
    adr: '每晚平均价格',
    adrHint: '客人通常一晚支付的金额 (ADR — Average Daily Rate)。',
    annual: '情景：入住率 65% 时的一年',
    annualHint: '每晚价格 × 365 × 65%。这是情景而非事实：巴厘岛没有可靠的入住率数据。未扣除平台佣金、管理费和税费。',
    range: '55–75% 时：',
    sourceTitle: '来源',
    estateMarket: 'estatemarket.io',
    none: '范围内无房源',
    fewData: '过少',
    total: (n: number) => `1 公里范围内 ${n} 套房源`,
  },
  nl: {
    title: 'Wat buren verdienen',
    subtitle: 'Volgens estatemarket.io — elke Booking-advertentie binnen 1 km',
    villas: "Villa's",
    apartments: 'Appartementen',
    listings: 'op Booking',
    adr: 'Gemiddelde prijs per nacht',
    adrHint: 'Wat een gast doorgaans betaalt voor één nacht (ADR — Average Daily Rate).',
    annual: 'Scenario: een jaar bij 65% bezetting',
    annualHint: 'Prijs per nacht × 365 × 65%. Een scenario, geen feit: betrouwbare bezettingsdata voor Bali bestaan niet. Vóór platformkosten, beheer en belasting.',
    range: 'bij 55–75%: ',
    sourceTitle: 'Bron',
    estateMarket: 'estatemarket.io',
    none: 'geen advertenties in straal',
    fewData: 'te weinig',
    total: (n: number) => `${n} ${n === 1 ? 'advertentie' : 'advertenties'} binnen 1 km`,
  },
  ban: {
    title: 'Sapunapi pikolih pisagané',
    subtitle: 'Manut data estatemarket.io — sami properti ring Booking ring radius 1 km',
    villas: 'Vila',
    apartments: 'Apartemen',
    listings: 'ring Booking',
    adr: 'Aji rata-rata sabilang wengi',
    adrHint: 'Sapunapi akéhné tamiu mayah sabilang awengi (ADR — Average Daily Rate).',
    annual: 'Skenario: awarsa ring okupansi 65%',
    annualHint: 'Aji awengi × 365 × 65%. Puniki skenario, boya fakta: data okupansi Bali sane kapercaya nenten wenten. Sadurung biaya platform, pangelolaan, miwah pajak.',
    range: 'ring 55–75%: ',
    sourceTitle: 'Sumber',
    estateMarket: 'estatemarket.io',
    none: 'nénten wénten data ring radius',
    fewData: 'kalintang akidik',
    total: (n: number) => `${n} properti ring radius 1 km`,
  },
  pl: {
    title: 'Ile zarabiają sąsiedzi',
    subtitle: 'Według estatemarket.io — wszystkie oferty z Booking w promieniu 1 km',
    villas: 'Wille',
    apartments: 'Apartamenty',
    listings: 'na Booking',
    adr: 'Średnia cena za noc',
    adrHint: 'Ile gość zwykle płaci za jedną noc (ADR — Average Daily Rate).',
    annual: 'Scenariusz: rok przy obłożeniu 65%',
    annualHint: 'Cena za noc × 365 × 65%. To scenariusz, nie fakt: wiarygodnych danych o obłożeniu na Bali nie ma. Przed prowizjami platform, zarządzaniem i podatkiem.',
    range: 'przy 55–75%: ',
    sourceTitle: 'Źródło',
    estateMarket: 'estatemarket.io',
    none: 'brak ofert w promieniu',
    fewData: 'zbyt mało',
    total: (n: number) => `${n} ${n === 1 ? 'oferta' : n < 5 ? 'oferty' : 'ofert'} w promieniu 1 km`,
  },
  uk: {
    title: 'Скільки заробляють сусіди',
    subtitle: 'За даними estatemarket.io — усі об’єкти на Booking у радіусі 1 км',
    villas: 'Вілли',
    apartments: 'Апартаменти',
    listings: 'на Booking',
    adr: 'Середня ціна за ніч',
    adrHint: 'Скільки в середньому платить гість за ніч (ADR — Average Daily Rate).',
    annual: 'Сценарій: рік за завантаження 65%',
    annualHint: 'Ціна за ніч × 365 × 65%. Це сценарій, а не факт: надійних даних про завантаження на Балі немає. До витрат на платформи, управління й податки.',
    range: 'за 55–75%: ',
    sourceTitle: 'Джерело',
    estateMarket: 'estatemarket.io',
    none: 'немає даних у радіусі',
    fewData: 'замало',
    total: (n: number) => `${n} ${n === 1 ? 'об’єкт' : n < 5 ? 'об’єкти' : 'об’єктів'} у радіусі 1 км`,
  },
} as const

type Copy = { [K in keyof (typeof COPY)['ru']]: (typeof COPY)['ru'][K] extends (...args: infer A) => infer R ? (...args: A) => R : string }

// Scenario figures to the nearest $100 — more digits would be false precision.
const round100 = (v: number) => Math.round(v / 100) * 100

function fmtUsd(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1000) return `$${Math.round(v).toLocaleString('en-US')}`
  return `$${Math.round(v)}`
}

export function MarketStatsBlock({ data, lang = 'ru' }: { data: ComplexMarketStats; lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  if (data.villa_count === 0 && data.apartment_count === 0) return null

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <TrendingUp size={18} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
              {c.title}
            </div>
            <div className="text-[13px] text-[var(--color-text-muted)] leading-snug">
              {c.subtitle} · {c.total(data.total_listings_500m)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.villa_count > 0 && (
            <SegmentCard
              icon={HomeIcon}
              label={c.villas}
              count={data.villa_count}
              adr={data.villa_adr_usd}
              c={c}
            />
          )}
          {data.apartment_count > 0 && (
            <SegmentCard
              icon={Hotel}
              label={c.apartments}
              count={data.apartment_count}
              adr={data.apartment_adr_usd}
              c={c}
            />
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2 text-[11.5px] text-[var(--color-text-muted)]">
          <a
            href="https://estatemarket.io/booking_data-map"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--color-primary)] no-underline"
          >
            {c.sourceTitle}: {c.estateMarket}
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </section>
  )
}

function SegmentCard({
  icon: Icon, label, count, adr, c,
}: {
  icon: typeof HomeIcon
  label: string
  count: number
  adr: number | null
  c: Copy
}) {
  // Annual gross revenue as a scenario at 65% (55–75% alongside), the same
  // assumption as /methodology. The estatemarket «occupancy» is the share of
  // blocked calendar dates (median ~95%), not nights sold, so it is neither
  // shown nor used: RevPAR × 365 on it roughly doubled the real figure.
  const annual = adr != null ? adr * 365 * 0.65 : null
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-[#111827] mb-3 pb-2 border-b border-[var(--color-border)]">
        <Icon size={15} className="text-[var(--color-primary)]" />
        {label}
        <span className="ml-auto text-[12px] font-normal text-[var(--color-text-muted)]">
          {count} {c.listings}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label={c.adr}    value={adr != null ? fmtUsd(adr) : c.fewData} hint={c.adrHint} />
        <Metric label={c.annual} value={annual != null ? fmtUsd(round100(annual)) : '—'} tone="primary" hint={c.annualHint}
          sub={adr != null ? `${c.range}${fmtUsd(round100(adr * 365 * 0.55))}–${fmtUsd(round100(adr * 365 * 0.75))}` : null} />
      </div>
    </div>
  )
}

function Metric({ label, value, tone = 'default', hint, sub }: {
  label: string; value: string; tone?: 'default' | 'primary'; hint?: string | null; sub?: string | null
}) {
  return (
    <div title={hint ?? undefined}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] leading-tight">{label}</div>
      <div className={`text-[17px] font-semibold mt-0.5 leading-none ${tone === 'primary' ? 'text-[var(--color-primary)]' : 'text-[#111827]'}`}>
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-[var(--color-text-muted)] mt-1">{sub}</div>}
    </div>
  )
}
