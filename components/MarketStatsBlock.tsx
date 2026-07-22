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
    title: 'Сколько зарабатывают соседи',
    subtitle: 'По данным estatemarket.io — все объекты на Booking в радиусе 1 км',
    villas: 'Виллы',
    apartments: 'Апартаменты',
    listings: 'на Booking',
    occupancy: 'Заполняемость',
    occupancyHint: 'Сколько процентов ночей в году объект реально сдан.',
    adr: 'Средняя цена за ночь',
    adrHint: 'Сколько в среднем платит гость за ночь (ADR — Average Daily Rate).',
    revpar: 'Доход с номера за ночь',
    revparHint: 'Средний заработок объекта с одной календарной ночи (RevPAR = заполняемость × цена).',
    annual: 'Прогноз дохода в год',
    annualHint: 'Доход с ночи × 365. Сколько примерно вилла этого района приносит за полный год при текущей заполняемости.',
    daysBooked: 'нед. забронированных в год',
    sourceTitle: 'Источник',
    estateMarket: 'estatemarket.io',
    none: 'нет данных в радиусе',
    fewData: 'мало данных',
    total: (n: number) => `${n} ${n === 1 ? 'объект' : n < 5 ? 'объекта' : 'объектов'} в радиусе 1 км`,
  },
  en: {
    title: 'What neighbours earn',
    subtitle: 'From estatemarket.io — every Booking listing within 1 km',
    villas: 'Villas',
    apartments: 'Apartments',
    listings: 'on Booking',
    occupancy: 'Occupancy',
    occupancyHint: 'Share of nights per year the property is actually rented.',
    adr: 'Average price per night',
    adrHint: 'What a guest typically pays for one night (ADR — Average Daily Rate).',
    revpar: 'Revenue per available night',
    revparHint: 'Average earnings per calendar night (RevPAR = occupancy × ADR).',
    annual: 'Estimated annual revenue',
    annualHint: 'RevPAR × 365. Roughly what a villa of this segment earns over a full year at the current occupancy and rate.',
    daysBooked: 'nights booked per year',
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
    occupancy: 'Tingkat hunian',
    occupancyHint: 'Persentase malam per tahun properti benar-benar disewakan.',
    adr: 'Harga rata-rata per malam',
    adrHint: 'Berapa yang biasanya dibayar tamu untuk satu malam (ADR — Average Daily Rate).',
    revpar: 'Pendapatan per malam tersedia',
    revparHint: 'Rata-rata pendapatan per malam kalender (RevPAR = tingkat hunian × ADR).',
    annual: 'Perkiraan pendapatan per tahun',
    annualHint: 'RevPAR × 365. Kira-kira berapa yang dihasilkan vila di segmen ini selama setahun penuh pada tingkat hunian dan harga saat ini.',
    daysBooked: 'malam terpesan per tahun',
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
    occupancy: 'Taux d’occupation',
    occupancyHint: 'Part des nuits par an où le bien est réellement loué.',
    adr: 'Prix moyen par nuit',
    adrHint: 'Ce qu’un client paie habituellement pour une nuit (ADR — Average Daily Rate).',
    revpar: 'Revenu par nuit disponible',
    revparHint: 'Revenu moyen par nuit calendaire (RevPAR = taux d’occupation × ADR).',
    annual: 'Revenu annuel estimé',
    annualHint: 'RevPAR × 365. Approximativement ce qu’une villa de ce segment rapporte sur une année complète au taux d’occupation et au prix actuels.',
    daysBooked: 'nuits réservées par an',
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
    occupancy: 'Auslastung',
    occupancyHint: 'Anteil der Nächte pro Jahr, in denen die Immobilie tatsächlich vermietet ist.',
    adr: 'Durchschnittspreis pro Nacht',
    adrHint: 'Was ein Gast typischerweise für eine Nacht zahlt (ADR — Average Daily Rate).',
    revpar: 'Ertrag pro verfügbarer Nacht',
    revparHint: 'Durchschnittlicher Ertrag pro Kalendernacht (RevPAR = Auslastung × ADR).',
    annual: 'Geschätzter Jahresertrag',
    annualHint: 'RevPAR × 365. Ungefähr, was eine Villa dieses Segments über ein ganzes Jahr bei aktueller Auslastung und Rate einbringt.',
    daysBooked: 'Nächte pro Jahr gebucht',
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
    occupancy: '入住率',
    occupancyHint: '房产每年实际出租的夜晚占比。',
    adr: '每晚平均价格',
    adrHint: '客人通常一晚支付的金额 (ADR — Average Daily Rate)。',
    revpar: '每可用夜收入',
    revparHint: '每个日历夜的平均收入 (RevPAR = 入住率 × ADR)。',
    annual: '预计年收入',
    annualHint: 'RevPAR × 365。按当前入住率和价格，该细分市场的别墅全年大约收入。',
    daysBooked: '每年预订夜数',
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
    occupancy: 'Bezetting',
    occupancyHint: 'Aandeel van de nachten per jaar dat het object daadwerkelijk verhuurd is.',
    adr: 'Gemiddelde prijs per nacht',
    adrHint: 'Wat een gast doorgaans betaalt voor één nacht (ADR — Average Daily Rate).',
    revpar: 'Opbrengst per beschikbare nacht',
    revparHint: 'Gemiddelde opbrengst per kalendernacht (RevPAR = bezetting × ADR).',
    annual: 'Geschatte jaaropbrengst',
    annualHint: 'RevPAR × 365. Ongeveer wat een villa in dit segment over een heel jaar opbrengt bij de huidige bezetting en prijs.',
    daysBooked: 'nachten geboekt per jaar',
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
    occupancy: 'Tingkat hunian',
    occupancyHint: 'Persentase wengi sabilang warsa properti kasewaang.',
    adr: 'Aji rata-rata sabilang wengi',
    adrHint: 'Sapunapi akéhné tamiu mayah sabilang awengi (ADR — Average Daily Rate).',
    revpar: 'Pikolih sabilang wengi sadia',
    revparHint: 'Pikolih rata-rata sabilang wengi kalénder (RevPAR = tingkat hunian × ADR).',
    annual: 'Perkiraan pikolih sabilang warsa',
    annualHint: 'RevPAR × 365. Kira-kira akéhné pikolih vila ring segmen puniki sajeroning awarsa manut tingkat hunian lan aji mangkin.',
    daysBooked: 'wengi kabooking sabilang warsa',
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
    occupancy: 'Obłożenie',
    occupancyHint: 'Odsetek nocy w roku, w które nieruchomość jest faktycznie wynajęta.',
    adr: 'Średnia cena za noc',
    adrHint: 'Ile gość zwykle płaci za jedną noc (ADR — Average Daily Rate).',
    revpar: 'Przychód na dostępną noc',
    revparHint: 'Średni przychód na noc kalendarzową (RevPAR = obłożenie × ADR).',
    annual: 'Szacowany przychód roczny',
    annualHint: 'RevPAR × 365. Mniej więcej tyle willa z tego segmentu zarabia przez cały rok przy obecnym obłożeniu i stawce.',
    daysBooked: 'nocy zarezerwowanych w roku',
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
    occupancy: 'Заповнюваність',
    occupancyHint: 'Скільки відсотків ночей на рік об’єкт реально зданий.',
    adr: 'Середня ціна за ніч',
    adrHint: 'Скільки в середньому платить гість за ніч (ADR — Average Daily Rate).',
    revpar: 'Дохід з номера за ніч',
    revparHint: 'Середній заробіток об’єкта з однієї календарної ночі (RevPAR = заповнюваність × ADR).',
    annual: 'Прогноз доходу за рік',
    annualHint: 'RevPAR × 365. Скільки приблизно вілла цього сегмента приносить за повний рік за поточної заповнюваності та ціни.',
    daysBooked: 'ночей заброньованих на рік',
    sourceTitle: 'Джерело',
    estateMarket: 'estatemarket.io',
    none: 'немає даних у радіусі',
    fewData: 'замало',
    total: (n: number) => `${n} ${n === 1 ? 'об’єкт' : n < 5 ? 'об’єкти' : 'об’єктів'} у радіусі 1 км`,
  },
} as const

type Copy = { [K in keyof (typeof COPY)['ru']]: (typeof COPY)['ru'][K] extends (...args: infer A) => infer R ? (...args: A) => R : string }

function fmtPct(v: number | null): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}
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
              occ={data.villa_occupancy_pct}
              adr={data.villa_adr_usd}
              revpar={data.villa_revpar_usd}
              c={c}
            />
          )}
          {data.apartment_count > 0 && (
            <SegmentCard
              icon={Hotel}
              label={c.apartments}
              count={data.apartment_count}
              occ={data.apartment_occupancy_pct}
              adr={data.apartment_adr_usd}
              revpar={data.apartment_revpar_usd}
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
  icon: Icon, label, count, occ, adr, revpar, c,
}: {
  icon: typeof HomeIcon
  label: string
  count: number
  occ: number | null
  adr: number | null
  revpar: number | null
  c: Copy
}) {
  // Derived: annual gross revenue per unit at current occupancy + ADR.
  // The single most actionable number for an investor evaluating a buy
  // (alongside the unit price they'll see elsewhere on the page).
  const annual = revpar != null ? revpar * 365 : null
  const daysBooked = occ != null ? Math.round((occ / 100) * 365) : null
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
        <Metric label={c.occupancy} value={fmtPct(occ)} hint={c.occupancyHint} sub={daysBooked != null ? `≈ ${daysBooked} ${c.daysBooked}` : null} />
        <Metric label={c.adr}       value={adr != null ? fmtUsd(adr) : c.fewData} hint={c.adrHint} />
        <Metric label={c.revpar}    value={revpar != null ? fmtUsd(revpar) : '—'} tone="primary" hint={c.revparHint} />
        <Metric label={c.annual}    value={annual != null ? fmtUsd(annual) : '—'} tone="primary" hint={c.annualHint} />
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
