// Балл востребованности юнита в своём районе.
//
// Число само по себе бессмысленно, поэтому рядом всегда стоит его прочтение
// («сильнее N% того, что сдаётся рядом») и размер группы сравнения: балл по
// 14 соседям и по 300 — разного веса, и прятать это от читателя нечестно.
//
// Два вида: `badge` для карточки юнита в списке ЖК и `full` для страницы
// самого юнита, где есть место под пояснение и цифры рынка.

import { pickCopy, type Lang } from '@/lib/i18n'
import { DEMAND_STRONG, DEMAND_WEAK, type UnitDemand } from '@/lib/unit-demand'

const COPY = {
  ru: {
    title: 'Востребованность в районе',
    of100: 'из 100',
    meaning: (pct: number) => `Сильнее ${pct}% объектов, которые сдаются рядом`,
    basis: {
      zone_beds: (n: number, zone: string) => `${n} объектов того же типа и размера в зоне «${zone}»`,
      zone: (n: number, zone: string) => `${n} объектов того же типа в зоне «${zone}»`,
      island: (n: number) => `${n} объектов того же типа по острову — рядом сопоставимых мало`,
    },
    rate: 'Ставка к соседям',
    occupancy: 'Загрузка сегмента',
    idle: 'Простаивают',
    perNight: '$/ночь',
    note: 'Оценка продукта по фотографиям против рынка краткосрочной аренды. Не прогноз доходности.',
  },
  en: {
    title: 'Demand in the area',
    of100: 'of 100',
    meaning: (pct: number) => `Stronger than ${pct}% of rentals nearby`,
    basis: {
      zone_beds: (n: number, zone: string) => `${n} rentals of the same type and size in ${zone}`,
      zone: (n: number, zone: string) => `${n} rentals of the same type in ${zone}`,
      island: (n: number) => `${n} rentals of the same type island-wide — few comparable ones nearby`,
    },
    rate: 'Rate vs neighbours',
    occupancy: 'Segment occupancy',
    idle: 'Sitting idle',
    perNight: '$/night',
    note: 'A read of the product from its photos against the short-term rental market. Not a yield forecast.',
  },
}

/** Полоса и подложка балла. Красный намеренно не используется: балл говорит
 *  о месте среди соседей, а не о браке. */
function tone(score: number) {
  if (score >= DEMAND_STRONG) return { fg: '#15803D', bg: '#DCFCE7', bar: '#16A34A' }
  if (score >= DEMAND_WEAK) return { fg: '#A16207', bg: '#FEF9C3', bar: '#CA8A04' }
  return { fg: '#525252', bg: '#F5F5F5', bar: '#A3A3A3' }
}

export function UnitDemandBadge({ demand, lang = 'ru' }: { demand: UnitDemand; lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  const t = tone(demand.score)
  return (
    <span
      className="inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: t.bg, color: t.fg }}
      title={c.meaning(demand.score)}
    >
      <span className="text-[13px] leading-none">{demand.score}</span>
      <span className="font-medium opacity-80">{c.title.toLowerCase()}</span>
    </span>
  )
}

/**
 * Полоса под карточкой юнита в списке ЖК: балл, его прочтение и первая фраза
 * объяснения. Отдельный вид, а не обрезанный блок, потому что в сетке из двух
 * колонок карточки должны остаться одной высоты, а пояснение — коротким.
 */
export function UnitDemandStrip({ demand, lang = 'ru' }: { demand: UnitDemand; lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  const t = tone(demand.score)
  return (
    <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[15px] font-semibold"
          style={{ background: t.bg, color: t.fg }}
        >
          {demand.score}
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-[#111827] leading-tight">{c.title}</div>
          <div className="text-[11px] text-[var(--color-text-muted)] leading-tight">
            {c.meaning(demand.score)}
          </div>
        </div>
      </div>
      {demand.why && (
        <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-muted)] line-clamp-3">
          {demand.why}
        </p>
      )}
    </div>
  )
}

export function UnitDemandBlock({ demand, lang = 'ru' }: { demand: UnitDemand; lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  const t = tone(demand.score)
  const basis =
    demand.basis === 'island'
      ? c.basis.island(demand.compsN)
      : c.basis[demand.basis](demand.compsN, demand.zone)

  const stats = [
    demand.adrVsNeighbours != null && {
      label: c.rate,
      value: `×${demand.adrVsNeighbours.toFixed(2)}`,
      hint: demand.expectedAdrUsd ? `~${demand.expectedAdrUsd} ${c.perNight}` : null,
    },
    demand.segmentOccupancyPct != null && {
      label: c.occupancy,
      value: `${Math.round(demand.segmentOccupancyPct)}%`,
      hint: null,
    },
    demand.segmentIdlePct != null && {
      label: c.idle,
      value: `${Math.round(demand.segmentIdlePct)}%`,
      hint: null,
    },
  ].filter(Boolean) as Array<{ label: string; value: string; hint: string | null }>

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4 sm:gap-5">
        <div
          className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center"
          style={{ background: t.bg, color: t.fg }}
        >
          <span className="text-[24px] sm:text-[30px] font-semibold leading-none">{demand.score}</span>
          <span className="text-[10px] sm:text-[11px] opacity-75 mt-0.5">{c.of100}</span>
        </div>
        <div className="min-w-0">
          <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#111827]">{c.title}</h3>
          <p className="text-[14px] text-[var(--color-text)] mt-0.5">{c.meaning(demand.score)}</p>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-1">{basis}</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${demand.score}%`, background: t.bar }} />
      </div>

      {demand.why && (
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--color-text)]">{demand.why}</p>
      )}

      {stats.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl bg-[var(--color-primary-soft)] px-3 py-2.5">
              <div className="text-[11px] text-[var(--color-text-muted)] leading-tight">{s.label}</div>
              <div className="text-[15px] font-semibold text-[#111827] mt-0.5">{s.value}</div>
              {s.hint && <div className="text-[11px] text-[var(--color-text-muted)]">{s.hint}</div>}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-text-muted)]">{c.note}</p>
    </section>
  )
}
