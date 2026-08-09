'use client'

// Балл востребованности в углу карточки юнита + подсказка по наведению.
//
// Подсказка раскрывается ВВЕРХ и прижата к правому краю: карточка обрезает
// содержимое (`overflow-hidden` на корневой ссылке), поэтому всё, что вылезет
// за её границы, будет срезано. Вверх места всегда хватает — там фотография.
//
// Наведение сделано на CSS через именованную группу, без состояния: карточка
// целиком является ссылкой, и любой обработчик клика здесь конфликтовал бы с
// переходом. На тач-устройствах подсказки не будет — там остаётся сам балл,
// а разбор целиком живёт на странице юнита.

import { pickCopy, type Lang } from '@/lib/i18n'
import { demandTone, type UnitDemandView } from '@/lib/unit-demand-view'

const COPY = {
  ru: {
    title: 'Востребованность в районе',
    meaning: (pct: number) => `Ожидаемо сильнее ${pct}% объектов, которые сдаются рядом`,
    basis: {
      zone_beds: (n: number, zone: string) => `Сравнение: ${n} объектов того же типа и размера в зоне «${zone}»`,
      zone: (n: number, zone: string) => `Сравнение: ${n} объектов того же типа в зоне «${zone}»`,
      island: (n: number) => `Сравнение: ${n} объектов того же типа по острову — рядом сопоставимых мало`,
    },
  },
  en: {
    title: 'Demand in the area',
    meaning: (pct: number) => `Expected to outperform ${pct}% of rentals nearby`,
    basis: {
      zone_beds: (n: number, zone: string) => `Compared with ${n} rentals of the same type and size in ${zone}`,
      zone: (n: number, zone: string) => `Compared with ${n} rentals of the same type in ${zone}`,
      island: (n: number) => `Compared with ${n} rentals of the same type island-wide — few comparable ones nearby`,
    },
  },
}

// `max-w-none` здесь обязателен и не является украшением: globals.css зажимает
// КАЖДОГО потомка <main> в max-width:100% родителя, а родитель подсказки —
// бейдж шириной 34px. Без этой утилиты подсказка схлопывается в вертикальную
// колонку по одной букве. См. раздел про max-width в CLAUDE.md.
const TOOLTIP_CLASS = [
  'pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-[248px] max-w-none',
  'rounded-xl border border-[var(--color-border)] bg-white p-3 text-left',
  'shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
  'opacity-0 invisible translate-y-1 transition-all duration-150',
  'group-hover/demand:opacity-100 group-hover/demand:visible group-hover/demand:translate-y-0',
].join(' ')

export function UnitDemandBadge({
  demand,
  lang = 'ru',
}: {
  demand: UnitDemandView
  lang?: Lang
}) {
  const c = pickCopy(COPY, lang)
  const t = demandTone(demand.score)
  const basis =
    demand.basis === 'island'
      ? c.basis.island(demand.compsN)
      : c.basis[demand.basis](demand.compsN, demand.zone)

  return (
    <span className="group/demand relative shrink-0">
      <span
        className="inline-flex items-center justify-center min-w-[34px] h-[26px] px-2 rounded-lg text-[14px] font-semibold tabular-nums cursor-help"
        style={{ background: t.bg, color: t.fg }}
        aria-label={`${c.title}: ${demand.score}`}
      >
        {demand.score}
      </span>

      <span
        role="tooltip"
        className={TOOLTIP_CLASS}
      >
        <span className="flex items-baseline gap-2">
          <span
            className="text-[13px] font-semibold leading-none rounded px-1.5 py-1"
            style={{ background: t.bg, color: t.fg }}
          >
            {demand.score}
          </span>
          <span className="text-[12px] font-semibold text-[#111827]">{c.title}</span>
        </span>
        <span className="mt-1.5 block text-[12px] leading-snug text-[var(--color-text)]">
          {c.meaning(demand.score)}
        </span>
        {demand.why && (
          <span className="mt-1.5 block text-[12px] leading-snug text-[var(--color-text-muted)]">
            {demand.why}
          </span>
        )}
        <span className="mt-1.5 block text-[11px] leading-snug text-[var(--color-text-muted)]">
          {basis}
        </span>
      </span>
    </span>
  )
}
