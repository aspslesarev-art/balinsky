'use client'

import { RotateCcw } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

// Плотность рынка под ползунком ADR: сколько соседей реально сдают по
// каждой ставке. Без неё ползунок двигается вслепую — видно число, но
// не видно, подтверждено ли оно рынком. Цвет — светофорные токены
// проекта: до медианы зелёный (так сдают многие), до p75 жёлтый,
// выше — красный (единичные случаи).

export function Slider({
  label, value, min, max, step, onChange, display, zones, zonesLabel,
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string
  // Плотность соседей по ставке: доля от самого населённого промежутка,
  // 0 — рядом никто так не сдаёт. Рисуется прямо в дорожке, чтобы было
  // видно, куда тянуть ползунок, и не появлялось отдельного блока.
  zones?: number[]
  zonesLabel?: string
}) {
  const clamped = Math.min(max, Math.max(min, value))
  const filled = max > min ? ((clamped - min) / (max - min)) * 100 : 0

  // Дорожка своя у всех ползунков: родная у input range приходит с
  // собственной рамкой и тенью, а на полоске в шесть пикселей любая
  // окантовка выглядит грязью.
  return (
    <div>
      <SliderHead label={label} display={display} />
      <div className="relative h-4 flex items-center" role={zones?.length ? 'img' : undefined} aria-label={zones?.length ? zonesLabel : undefined}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full overflow-hidden flex bg-[#F3F4F6]">
          {zones?.length
            ? zones.map((share, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    background: share > 0 ? 'var(--color-progress-low)' : 'transparent',
                    opacity: share > 0 ? Math.max(0.45, Math.min(1, share)) : 1,
                  }}
                />
              ))
            : <div className="h-full bg-[var(--color-primary)]" style={{ width: `${filled}%` }} />}
        </div>
        <input
          type="range"
          min={min} max={max} step={step} value={clamped}
          onChange={ev => onChange(Number(ev.target.value))}
          className="range-bare relative w-full h-4 cursor-pointer"
        />
      </div>
    </div>
  )
}

export function SliderHead({ label, display }: { label: string; display: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[14px] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[16px] font-semibold text-[var(--color-text)] tabular-nums">{display}</span>
    </div>
  )
}

// «Сбросить» в шапке калькулятора: вернуть цену объекта и обычные значения.
// Место под кнопку занято всегда (invisible): появление не сдвигает ни строку, ни текст.
export function ResetButton({ onClick, lang, show }: { onClick: () => void; lang: Lang; show: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-hidden={!show} tabIndex={show ? 0 : -1}
      className={`${show ? '' : 'invisible '}-my-1.5 inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 text-[13px] font-medium text-[var(--color-text)] transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]`}>
      <RotateCcw size={14} aria-hidden />
      {pickCopy({ ru: 'Сбросить', en: 'Reset' }, lang)}
    </button>
  )
}

