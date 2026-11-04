import type { ReactNode } from 'react'

// Шкала «этот объект против соседей»: три равные трети — до четверти рынка,
// середина, после трёх четвертей; точка — этот объект, черта — середина.
// Вынесена из «Продажа рядом» (макет «Продажа рядом: вариант 1», 23.10.2026),
// чтобы «Посуточно» выглядело так же (владелец 04.11.2026).
// lowGood — дешевле значит лучше (покупка): левая треть зелёная, правая
// красная; иначе (аренда) наоборот.
export type ScaleQuartiles = { min: number; p25: number; p75: number; max: number }

export function PriceScale({ self, median, q, selfLabel, midLabel, lowGood, redDot = false }: {
  self: number
  median: number
  q: ScaleQuartiles
  selfLabel: ReactNode
  midLabel: ReactNode
  lowGood: boolean
  /** Точка всегда красная, как была в «Продаже рядом». */
  redDot?: boolean
}) {
  const pos = (v: number) => {
    const seg = (a: number, b: number, lo: number) => lo + (b > a ? Math.min(1, Math.max(0, (v - a) / (b - a))) : 0.5) * 100 / 3
    return v < q.p25 ? seg(q.min, q.p25, 0) : v <= q.p75 ? seg(q.p25, q.p75, 100 / 3) : seg(q.p75, Math.max(q.max, v), 200 / 3)
  }
  const zones = lowGood
    ? 'bg-[linear-gradient(90deg,rgb(31_139_95/.25)_0_33.3%,rgb(232_160_40/.3)_33.3%_66.6%,rgb(209_67_52/.25)_66.6%_100%)]'
    : 'bg-[linear-gradient(90deg,rgb(209_67_52/.25)_0_33.3%,rgb(232_160_40/.3)_33.3%_66.6%,rgb(31_139_95/.25)_66.6%_100%)]'
  // Точка — красная там, где для владельца хуже, иначе зелёная.
  const bad = redDot || (lowGood ? self > q.p75 : self < q.p25)
  const dot = bad ? 'bg-[#D93025] shadow-[0_0_0_2px_#D93025]' : 'bg-[var(--color-primary)] shadow-[0_0_0_2px_var(--color-primary)]'
  return (
    <div className="flex flex-col gap-2 px-2">
      {/* Объект — подписью над шкалой, середина — под ней: так не накладываются. */}
      <div className="relative h-10 text-[13px]">
        <span className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-center font-semibold text-[var(--color-text)]" style={{ left: `${Math.min(85, Math.max(15, pos(self)))}%` }}>{selfLabel}</span>
      </div>
      <div className={`relative h-3 rounded-full ${zones}`} aria-hidden="true">
        <div className="absolute -inset-y-1.5 w-0.5 bg-[var(--color-text-muted)]" style={{ left: `${pos(median)}%` }} />
        <div className={`absolute -top-[5px] h-[22px] w-[22px] -translate-x-1/2 rounded-full border-[3px] border-white ${dot}`} style={{ left: `${pos(self)}%` }} />
      </div>
      <div className="relative h-10 text-[13px] text-[var(--color-text-muted)]">
        <span className="absolute -translate-x-1/2 whitespace-nowrap text-center" style={{ left: `${Math.min(85, Math.max(15, pos(median)))}%` }}>{midLabel}</span>
      </div>
    </div>
  )
}
