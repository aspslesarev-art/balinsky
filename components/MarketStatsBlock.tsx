// "Рынок краткосрочной аренды поблизости" — compact comparables block
// fed from estatemarket.io. Always renders the segment cards directly
// (no collapse) — the segment data is what makes the block worth
// showing in the first place. Renders nothing when both villa_count
// and apartment_count are 0.

import { TrendingUp, Hotel, Home as HomeIcon, ExternalLink } from 'lucide-react'
import type { ComplexMarketStats } from '@/lib/complex-market-stats'
import type { ReactNode } from 'react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { InlinePrice } from './InlinePrice'

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
    annualHint: 'Цена за ночь × 365 × 65%. Это сценарий, а не факт: загрузку для конкретного объекта считаем на его странице. До расходов на площадки, управление и налоги.',
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
    annualHint: 'Nightly price × 365 × 65%. A scenario, not a fact: occupancy for a specific property is calculated on its own page. Before platform fees, management and tax.',
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
    annualHint: 'Harga per malam × 365 × 65%. Ini skenario, bukan fakta: okupansi untuk properti tertentu dihitung di halamannya sendiri. Sebelum biaya platform, pengelolaan, dan pajak.',
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
    annualHint: 'Prix par nuit × 365 × 65 %. Un scénario, pas un fait : l’occupation d’un bien précis est calculée sur sa propre page. Avant commissions, gestion et impôts.',
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
    annualHint: 'Preis pro Nacht × 365 × 65 %. Ein Szenario, keine Tatsache: die Auslastung eines bestimmten Objekts wird auf seiner eigenen Seite berechnet. Vor Plattformgebühren, Verwaltung und Steuern.',
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
    annualHint: '每晚价格 × 365 × 65%。这是情景而非事实：具体房源的入住率在其页面上单独计算。未扣除平台佣金、管理费和税费。',
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
    annualHint: 'Prijs per nacht × 365 × 65%. Een scenario, geen feit: de bezetting van een specifiek object wordt op zijn eigen pagina berekend. Vóór platformkosten, beheer en belasting.',
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
    annualHint: 'Aji awengi × 365 × 65%. Puniki skenario, boya fakta: okupansi properti sane tertentu kaitung ring halamannyane. Sadurung biaya platform, pangelolaan, miwah pajak.',
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
    annualHint: 'Cena za noc × 365 × 65%. To scenariusz, nie fakt: obłożenie konkretnego obiektu liczymy na jego stronie. Przed prowizjami platform, zarządzaniem i podatkiem.',
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
    annualHint: 'Ціна за ніч × 365 × 65%. Це сценарій, а не факт: завантаження для конкретного об’єкта рахуємо на його сторінці. До витрат на платформи, управління й податки.',
    range: 'за 55–75%: ',
    sourceTitle: 'Джерело',
    estateMarket: 'estatemarket.io',
    none: 'немає даних у радіусі',
    fewData: 'замало',
    total: (n: number) => `${n} ${n === 1 ? 'об’єкт' : n < 5 ? 'об’єкти' : 'об’єктів'} у радіусі 1 км`,
  },
} as const

// Выручка по загрузке района — той же, что считает страница объекта
// (lib/investment/snapshot.ts, marketOccupancy). Без неё (страница
// комплекса) — прежний сценарий 65%.
const OCC_COPY: Partial<Record<Lang, { annual: (pct: number) => string; hint: (pct: number) => string; range: (lo: number, hi: number) => string }>> = {
  ru: {
    annual: pct => `Выручка за год при загрузке ${pct}%`,
    hint: pct => `Цена за ночь × 365 × ${pct}%. ${pct}% - загрузка похожих объектов рядом по календарям Booking: берём уровень чуть ниже середины, новые объекты сдаются хуже раскрученных. До расходов на площадки, управление и налоги.`,
    range: (lo, hi) => `при ${lo}–${hi}%: `,
  },
  en: {
    annual: pct => `Gross a year at ${pct}% occupancy`,
    hint: pct => `Nightly price × 365 × ${pct}%. ${pct}% is the occupancy of similar places nearby from Booking calendars, taken slightly below the middle: new places rent worse than established ones. Before platform fees, management and tax.`,
    range: (lo, hi) => `at ${lo}–${hi}%: `,
  },
  id: {
    annual: pct => `Pendapatan setahun dengan okupansi ${pct}%`,
    hint: pct => `Harga per malam × 365 × ${pct}%. ${pct}% adalah okupansi properti serupa di sekitar menurut kalender Booking, diambil sedikit di bawah nilai tengah: properti baru lebih sulit disewakan daripada yang sudah dikenal. Sebelum biaya platform, pengelolaan, dan pajak.`,
    range: (lo, hi) => `pada ${lo}–${hi}%: `,
  },
  fr: {
    annual: pct => `Revenu annuel à ${pct} % d’occupation`,
    hint: pct => `Prix par nuit × 365 × ${pct} %. ${pct} % est l’occupation des biens similaires alentour d’après les calendriers Booking, prise un peu sous la médiane : un bien neuf se loue moins bien qu’un bien établi. Avant commissions, gestion et impôts.`,
    range: (lo, hi) => `à ${lo}–${hi} % : `,
  },
  de: {
    annual: pct => `Jahresumsatz bei ${pct} % Auslastung`,
    hint: pct => `Preis pro Nacht × 365 × ${pct} %. ${pct} % ist die Auslastung ähnlicher Objekte in der Nähe laut Booking-Kalendern, etwas unter der Mitte angesetzt: neue Objekte vermieten sich schlechter als etablierte. Vor Plattformgebühren, Verwaltung und Steuern.`,
    range: (lo, hi) => `bei ${lo}–${hi} %: `,
  },
  zh: {
    annual: pct => `入住率 ${pct}% 时的年收入`,
    hint: pct => `每晚价格 × 365 × ${pct}%。${pct}% 是根据Booking日历得出的附近类似房源入住率，取略低于中位数的水平：新房源比成熟房源更难出租。未扣除平台佣金、管理费和税费。`,
    range: (lo, hi) => `入住率 ${lo}–${hi}% 时：`,
  },
  nl: {
    annual: pct => `Jaaromzet bij ${pct}% bezetting`,
    hint: pct => `Prijs per nacht × 365 × ${pct}%. ${pct}% is de bezetting van vergelijkbare objecten in de buurt volgens Booking-agenda’s, iets onder het midden genomen: nieuwe objecten verhuren slechter dan gevestigde. Vóór platformkosten, beheer en belasting.`,
    range: (lo, hi) => `bij ${lo}–${hi}%: `,
  },
  ban: {
    annual: pct => `Pikolih awarsa ring okupansi ${pct}%`,
    hint: pct => `Aji awengi × 365 × ${pct}%. ${pct}% inggih punika okupansi properti pateh ring sisi manut kalender Booking, kaambil akidik ring sor tengah: properti anyar kirang laris katimbang sane sampun kaloktah. Sadurung biaya platform, pangelolaan, miwah pajak.`,
    range: (lo, hi) => `ring ${lo}–${hi}%: `,
  },
  pl: {
    annual: pct => `Przychód roczny przy obłożeniu ${pct}%`,
    hint: pct => `Cena za noc × 365 × ${pct}%. ${pct}% to obłożenie podobnych obiektów w pobliżu według kalendarzy Booking, przyjęte nieco poniżej środka: nowe obiekty wynajmują się gorzej niż znane. Przed prowizjami platform, zarządzaniem i podatkiem.`,
    range: (lo, hi) => `przy ${lo}–${hi}%: `,
  },
  uk: {
    annual: pct => `Виторг за рік за завантаження ${pct}%`,
    hint: pct => `Ціна за ніч × 365 × ${pct}%. ${pct}% - завантаження схожих об’єктів поруч за календарями Booking, беремо рівень трохи нижче середини: нові об’єкти здаються гірше за розкручені. До витрат на платформи, управління й податки.`,
    range: (lo, hi) => `за ${lo}–${hi}%: `,
  },
}

type Copy = { [K in keyof (typeof COPY)['ru']]: (typeof COPY)['ru'][K] extends (...args: infer A) => infer R ? (...args: A) => R : string }

// Scenario figures to the nearest $100 — more digits would be false precision.
const round100 = (v: number) => Math.round(v / 100) * 100

// В валюте посетителя, как цены по всему сайту: раньше тут всегда стояли
// доллары, а рядом («карта страницы», калькулятор) — рупии или рубли, и
// одна и та же ставка выглядела двумя разными числами.
function Money({ usd, lang }: { usd: number | null; lang: Lang }) {
  if (usd == null) return <>—</>
  return <InlinePrice usd={Math.round(usd)} lang={lang} />
}

export function MarketStatsBlock({ data, lang = 'ru', occupancy = null }: {
  data: ComplexMarketStats
  lang?: Lang
  /** Загрузка района для этого объекта (0..1) и к какой карточке она относится. */
  occupancy?: { value: number; kind: 'villa' | 'apartment' } | null
}) {
  const c = pickCopy(COPY, lang)
  const oc = occupancy && OCC_COPY[lang] ? { ...occupancy, copy: OCC_COPY[lang]! } : null
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
            <SegmentCard lang={lang}
              icon={HomeIcon}
              label={c.villas}
              count={data.villa_count}
              adr={data.villa_adr_usd}
              occ={oc?.kind === 'villa' ? oc : null}
              c={c}
            />
          )}
          {data.apartment_count > 0 && (
            <SegmentCard lang={lang}
              icon={Hotel}
              label={c.apartments}
              count={data.apartment_count}
              adr={data.apartment_adr_usd}
              occ={oc?.kind === 'apartment' ? oc : null}
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
  icon: Icon, label, count, adr, occ, c, lang,
}: {
  icon: typeof HomeIcon
  label: string
  count: number
  adr: number | null
  occ?: { value: number; copy: NonNullable<(typeof OCC_COPY)['ru']> } | null
  c: Copy
  lang: Lang
}) {
  // Annual gross revenue as a scenario at 65% (55–75% alongside), the same
  // assumption as /methodology. The estatemarket «occupancy» is the share of
  // blocked calendar dates (median ~95%), not nights sold, so it is neither
  // shown nor used: RevPAR × 365 on it roughly doubled the real figure.
  // Есть загрузка района у страницы объекта — считаем по ней, ±10 п. рядом.
  const mid = occ ? occ.value : 0.65
  const lo = occ ? Math.max(0.3, mid - 0.1) : 0.55
  const hi = occ ? Math.min(0.95, mid + 0.1) : 0.75
  const pct = (v: number) => Math.round(v * 100)
  const annual = adr != null ? adr * 365 * mid : null
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--color-text)] mb-3 pb-2 border-b border-[var(--color-border)]">
        <Icon size={15} className="text-[var(--color-primary)]" />
        {label}
        <span className="ml-auto text-[12px] font-normal text-[var(--color-text-muted)]">
          {count} {c.listings}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label={c.adr}    value={adr != null ? <Money usd={adr} lang={lang} /> : c.fewData} hint={c.adrHint} />
        <Metric label={occ ? occ.copy.annual(pct(mid)) : c.annual} value={annual != null ? <Money usd={round100(annual)} lang={lang} /> : '—'} tone="primary"
          hint={occ ? occ.copy.hint(pct(mid)) : c.annualHint}
          sub={adr != null ? <>{occ ? occ.copy.range(pct(lo), pct(hi)) : c.range}<Money usd={round100(adr * 365 * lo)} lang={lang} />–<Money usd={round100(adr * 365 * hi)} lang={lang} /></> : null} />
      </div>
    </div>
  )
}

function Metric({ label, value, tone = 'default', hint, sub }: {
  label: string; value: ReactNode; tone?: 'default' | 'primary'; hint?: string | null; sub?: ReactNode
}) {
  return (
    <div title={hint ?? undefined}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] leading-tight">{label}</div>
      <div className={`text-[17px] font-semibold mt-0.5 leading-none ${tone === 'primary' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-[var(--color-text-muted)] mt-1">{sub}</div>}
    </div>
  )
}
