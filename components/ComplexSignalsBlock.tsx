// Presentational "Инвест-сигналы" block for a complex page. Server Component.
// Renders up to four compact investment signals synthesised in
// lib/complex-signals.ts. Renders nothing when none is available.
import { TrendingUp, Waves, Flame, KeyRound } from 'lucide-react'
import type { ComplexSignals, BeachZone } from '@/lib/complex-signals'
import { pickCopy, type Lang } from '@/lib/i18n'

type ZoneKey = `zone_${BeachZone}`

const COPY = {
  ru: {
    title: 'Инвест-сигналы', yieldLabel: 'Доходность аренды', perYear: (p: string) => `~${p}% годовых`,
    zoneLabel: 'До пляжа', zone_beachfront: 'Первая линия', zone_walking: 'Пешком до пляжа', zone_scooter: 'Пляж рядом', zone_inland: 'Вглубь острова',
    walkMin: (m: number) => `${m} мин пешком`, occLabel: 'Загрузка района',
    above: (d: string) => `выше района на ${d} п.п.`, below: (d: string) => `ниже района на ${d} п.п.`, equal: 'на уровне района',
    timingLabel: 'Срок сдачи', ready: 'Готов — доход сразу', soon: (y: number | null) => (y ? `Ключи в ${y}` : 'Скоро ключи'), building: (y: number | null) => (y ? `Сдача в ${y}` : 'Строится'),
  },
  en: {
    title: 'Investment signals', yieldLabel: 'Rental yield', perYear: (p: string) => `~${p}% / year`,
    zoneLabel: 'To the beach', zone_beachfront: 'Beachfront', zone_walking: 'Walk to beach', zone_scooter: 'Beach nearby', zone_inland: 'Inland',
    walkMin: (m: number) => `${m} min walk`, occLabel: 'District demand',
    above: (d: string) => `${d} pp above district`, below: (d: string) => `${d} pp below district`, equal: 'in line with district',
    timingLabel: 'Completion', ready: 'Ready — income now', soon: (y: number | null) => (y ? `Keys in ${y}` : 'Keys soon'), building: (y: number | null) => (y ? `Handover ${y}` : 'Under construction'),
  },
  id: {
    title: 'Sinyal investasi', yieldLabel: 'Imbal hasil sewa', perYear: (p: string) => `~${p}% / thn`,
    zoneLabel: 'Ke pantai', zone_beachfront: 'Tepi pantai', zone_walking: 'Jalan ke pantai', zone_scooter: 'Pantai dekat', zone_inland: 'Pedalaman',
    walkMin: (m: number) => `${m} mnt jalan`, occLabel: 'Permintaan area',
    above: (d: string) => `${d} pp di atas area`, below: (d: string) => `${d} pp di bawah area`, equal: 'setara area',
    timingLabel: 'Serah terima', ready: 'Siap — pendapatan langsung', soon: (y: number | null) => (y ? `Kunci ${y}` : 'Kunci segera'), building: (y: number | null) => (y ? `Serah terima ${y}` : 'Dalam pembangunan'),
  },
  fr: {
    title: 'Signaux d’investissement', yieldLabel: 'Rendement locatif', perYear: (p: string) => `~${p}% / an`,
    zoneLabel: 'Vers la plage', zone_beachfront: 'Première ligne', zone_walking: 'Plage à pied', zone_scooter: 'Plage proche', zone_inland: 'Intérieur',
    walkMin: (m: number) => `${m} min à pied`, occLabel: 'Demande du secteur',
    above: (d: string) => `${d} pts au-dessus`, below: (d: string) => `${d} pts en dessous`, equal: 'au niveau du secteur',
    timingLabel: 'Livraison', ready: 'Livré — revenu immédiat', soon: (y: number | null) => (y ? `Clés en ${y}` : 'Clés bientôt'), building: (y: number | null) => (y ? `Livraison ${y}` : 'En construction'),
  },
  de: {
    title: 'Investment-Signale', yieldLabel: 'Mietrendite', perYear: (p: string) => `~${p}% / Jahr`,
    zoneLabel: 'Zum Strand', zone_beachfront: 'Erste Reihe', zone_walking: 'Strand zu Fuß', zone_scooter: 'Strand nah', zone_inland: 'Landeinwärts',
    walkMin: (m: number) => `${m} Min. zu Fuß`, occLabel: 'Nachfrage im Gebiet',
    above: (d: string) => `${d} Pp über Gebiet`, below: (d: string) => `${d} Pp unter Gebiet`, equal: 'auf Gebietsniveau',
    timingLabel: 'Fertigstellung', ready: 'Fertig — Ertrag sofort', soon: (y: number | null) => (y ? `Schlüssel ${y}` : 'Bald fertig'), building: (y: number | null) => (y ? `Übergabe ${y}` : 'Im Bau'),
  },
  zh: {
    title: '投资信号', yieldLabel: '租金收益率', perYear: (p: string) => `~${p}% / 年`,
    zoneLabel: '到海滩', zone_beachfront: '海景第一排', zone_walking: '步行到海滩', zone_scooter: '海滩就近', zone_inland: '内陆',
    walkMin: (m: number) => `步行 ${m} 分钟`, occLabel: '区域需求',
    above: (d: string) => `高于区域 ${d} 个百分点`, below: (d: string) => `低于区域 ${d} 个百分点`, equal: '与区域持平',
    timingLabel: '交付', ready: '已建成 — 立即收租', soon: (y: number | null) => (y ? `${y} 年交房` : '即将交房'), building: (y: number | null) => (y ? `${y} 年交付` : '建设中'),
  },
  nl: {
    title: 'Investeringssignalen', yieldLabel: 'Huurrendement', perYear: (p: string) => `~${p}% / jaar`,
    zoneLabel: 'Naar het strand', zone_beachfront: 'Eerste lijn', zone_walking: 'Lopend naar strand', zone_scooter: 'Strand dichtbij', zone_inland: 'Landinwaarts',
    walkMin: (m: number) => `${m} min lopen`, occLabel: 'Vraag in de buurt',
    above: (d: string) => `${d} pp boven buurt`, below: (d: string) => `${d} pp onder buurt`, equal: 'op buurtniveau',
    timingLabel: 'Oplevering', ready: 'Klaar — inkomen nu', soon: (y: number | null) => (y ? `Sleutels ${y}` : 'Sleutels binnenkort'), building: (y: number | null) => (y ? `Oplevering ${y}` : 'In aanbouw'),
  },
  ban: {
    title: 'Sinyal investasi', yieldLabel: 'Pikolih sewa', perYear: (p: string) => `~${p}% / warsa`,
    zoneLabel: 'Ka pasih', zone_beachfront: 'Arep pasih', zone_walking: 'Mamargi ka pasih', zone_scooter: 'Pasih paek', zone_inland: 'Ka tengah',
    walkMin: (m: number) => `${m} mnt mamargi`, occLabel: 'Panagih wewidangan',
    above: (d: string) => `${d} pp langkung wewidangan`, below: (d: string) => `${d} pp kirang wewidangan`, equal: 'pateh sareng wewidangan',
    timingLabel: 'Serah terima', ready: 'Puput — pikolih gelis', soon: (y: number | null) => (y ? `Konci ${y}` : 'Konci gelis'), building: (y: number | null) => (y ? `Serah terima ${y}` : 'Kantun kawangun'),
  },
  pl: {
    title: 'Sygnały inwestycyjne', yieldLabel: 'Rentowność najmu', perYear: (p: string) => `~${p}% / rok`,
    zoneLabel: 'Do plaży', zone_beachfront: 'Pierwsza linia', zone_walking: 'Pieszo na plażę', zone_scooter: 'Plaża blisko', zone_inland: 'W głąb wyspy',
    walkMin: (m: number) => `${m} min pieszo`, occLabel: 'Popyt w okolicy',
    above: (d: string) => `${d} pp powyżej okolicy`, below: (d: string) => `${d} pp poniżej okolicy`, equal: 'na poziomie okolicy',
    timingLabel: 'Oddanie', ready: 'Gotowe — dochód od zaraz', soon: (y: number | null) => (y ? `Klucze w ${y}` : 'Klucze wkrótce'), building: (y: number | null) => (y ? `Oddanie ${y}` : 'W budowie'),
  },
  uk: {
    title: 'Інвест-сигнали', yieldLabel: 'Дохідність оренди', perYear: (p: string) => `~${p}% річних`,
    zoneLabel: 'До пляжу', zone_beachfront: 'Перша лінія', zone_walking: 'Пішки до пляжу', zone_scooter: 'Пляж поруч', zone_inland: 'Углиб острова',
    walkMin: (m: number) => `${m} хв пішки`, occLabel: 'Попит району',
    above: (d: string) => `вище району на ${d} в.п.`, below: (d: string) => `нижче району на ${d} в.п.`, equal: 'на рівні району',
    timingLabel: 'Термін здачі', ready: 'Готовий — дохід одразу', soon: (y: number | null) => (y ? `Ключі у ${y}` : 'Скоро ключі'), building: (y: number | null) => (y ? `Здача у ${y}` : 'Будується'),
  },
} as const

export function ComplexSignalsBlock({ signals, lang = 'ru' }: { signals: ComplexSignals; lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  const { yield: y, zone, occupancy: occ, timing } = signals
  if (!y && !zone && !occ && !timing) return null

  const zoneKey = zone ? (`zone_${zone.zone}` as ZoneKey) : null
  const occValue = occ
    ? occ.deltaPp >= 1
      ? c.above(occ.deltaPp.toFixed(0))
      : occ.deltaPp <= -1
        ? c.below(Math.abs(occ.deltaPp).toFixed(0))
        : c.equal
    : null
  const occTone: 'up' | 'down' | 'default' = occ ? (occ.deltaPp >= 1 ? 'up' : occ.deltaPp <= -1 ? 'down' : 'default') : 'default'
  const timingValue = timing
    ? timing.state === 'ready'
      ? c.ready
      : timing.state === 'soon'
        ? c.soon(timing.year)
        : c.building(timing.year)
    : null

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-[#111827]">{c.title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {y && (
          <Signal
            Icon={TrendingUp}
            label={c.yieldLabel}
            value={c.perYear(y.pct.toFixed(1))}
            tone="primary"
          />
        )}
        {zone && zoneKey && (
          <Signal
            Icon={Waves}
            label={c.zoneLabel}
            value={c[zoneKey]}
            sub={zone.walkingMinutes != null ? c.walkMin(zone.walkingMinutes) : zone.beachName}
          />
        )}
        {occ && occValue && (
          <Signal
            Icon={Flame}
            label={c.occLabel}
            value={occValue}
            tone={occTone === 'up' ? 'primary' : 'default'}
            sub={`${occ.pct.toFixed(0)}%`}
          />
        )}
        {timing && timingValue && (
          <Signal Icon={KeyRound} label={c.timingLabel} value={timingValue} />
        )}
      </div>
    </section>
  )
}

function Signal({
  Icon, label, value, sub, tone = 'default',
}: {
  Icon: typeof TrendingUp
  label: string
  value: string
  sub?: string | null
  tone?: 'default' | 'primary'
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-[var(--color-text-muted)]">
        <Icon size={15} className="shrink-0 text-[var(--color-primary)]" />
        <span className="truncate text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-[15px] font-semibold leading-tight ${tone === 'primary' ? 'text-[var(--color-primary)]' : 'text-[#111827]'}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">{sub}</div>}
    </div>
  )
}
