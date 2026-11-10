'use client'

import { useState } from 'react'
import Link from 'next/link'

export type VillaUnit = {
  unit: number
  bedrooms: number
  area: number
  price: number
  sold: boolean
  slug: string
}

type Props = {
  villas: VillaUnit[]
  masterplanUrl: string
  lang: string
}

const PINS: Record<number, { x: number; y: number }> = {
  1:  { x: 42, y: 20 },
  2:  { x: 23, y: 30 },
  3:  { x: 38, y: 30 },
  4:  { x: 58, y: 20 },
  5:  { x: 25, y: 50 },
  6:  { x: 42, y: 46 },
  7:  { x: 62, y: 36 },
  8:  { x: 28, y: 62 },
  9:  { x: 48, y: 62 },
  10: { x: 62, y: 50 },
}

export function EcoWoodChessBoard({ villas, masterplanUrl, lang }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const villaRoot = lang === 'en' ? '/en/villas/o' : '/ru/villy/o'
  const labels = lang === 'en'
    ? { title: 'Availability', br: 'BR', available: 'Available', sold: 'Sold', area: 'm²' }
    : { title: 'Шахматка', br: 'сп.', available: 'В продаже', sold: 'Продано', area: 'м²' }

  const availableCount = villas.filter(v => !v.sold).length
  const soldCount = villas.filter(v => v.sold).length

  return (
    <div className="mt-8">
      <h3 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
        {labels.title}
      </h3>

      <div className="flex gap-4 mb-4 text-[13px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(34 197 94)' }} />
          {labels.available} ({availableCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(239 68 68)' }} />
          {labels.sold} ({soldCount})
        </span>
      </div>

      <div className="relative w-full">
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={masterplanUrl}
            alt="EcoWood masterplan"
            className="w-full h-auto block"
            width={1600}
            height={893}
          />
        </div>

        <div className="absolute inset-0">
          {villas.map(v => {
            const pin = PINS[v.unit]
            if (!pin) return null
            const isHovered = hovered === v.unit
            const bg = v.sold ? 'rgb(239 68 68)' : 'rgb(34 197 94)'
            const tooltipBelow = pin.y < 30

            return (
              <Link
                key={v.unit}
                href={`${villaRoot}/${v.slug}`}
                className="absolute flex items-center justify-center transition-all duration-200"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: `translate(-50%, -50%) scale(${isHovered ? 1.25 : 1})`,
                  width: 'clamp(24px, 4vw, 40px)',
                  height: 'clamp(24px, 4vw, 40px)',
                  backgroundColor: bg,
                  borderRadius: '50%',
                  border: '2.5px solid white',
                  boxShadow: isHovered
                    ? '0 0 0 3px rgba(255,255,255,0.4), 0 4px 16px rgba(0,0,0,0.4)'
                    : '0 2px 8px rgba(0,0,0,0.4)',
                  zIndex: isHovered ? 20 : 10,
                }}
                onMouseEnter={() => setHovered(v.unit)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="text-white font-bold drop-shadow-sm" style={{ fontSize: 'clamp(10px, 1.8vw, 16px)' }}>
                  {v.unit}
                </span>

                {isHovered && (
                  <div
                    className="absolute left-1/2 whitespace-nowrap rounded-lg px-3 py-2 text-center pointer-events-none"
                    style={{
                      ...(tooltipBelow
                        ? { top: 'calc(100% + 8px)' }
                        : { bottom: 'calc(100% + 8px)' }),
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div className="text-white font-semibold text-[13px] leading-tight">
                      Villa #{v.unit}
                    </div>
                    <div className="text-white/70 text-[11px] leading-tight mt-0.5">
                      {v.bedrooms}{labels.br} · {v.area}{labels.area}
                    </div>
                    <div className="font-semibold text-[13px] leading-tight mt-0.5" style={{ color: v.sold ? 'rgb(252 165 165)' : 'rgb(134 239 172)' }}>
                      {v.sold ? labels.sold : `$${v.price.toLocaleString('en-US')}`}
                    </div>
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        ...(tooltipBelow
                          ? { bottom: '100%', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid rgba(0,0,0,0.85)' }
                          : { top: '100%', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(0,0,0,0.85)' }),
                        width: 0,
                        height: 0,
                      }}
                    />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
        {villas.map(v => (
          <Link
            key={v.unit}
            href={`${villaRoot}/${v.slug}`}
            className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-center transition-colors"
            style={{
              backgroundColor: v.sold ? 'rgb(239 68 68 / 0.08)' : 'rgb(34 197 94 / 0.08)',
              border: `1px solid ${v.sold ? 'rgb(239 68 68 / 0.2)' : 'rgb(34 197 94 / 0.2)'}`,
            }}
            onMouseEnter={() => setHovered(v.unit)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="font-semibold text-[14px] text-[var(--color-text)]">
              Villa #{v.unit}
            </span>
            <span className="text-[12px] text-[var(--color-text-muted)]">
              {v.bedrooms}{labels.br} · {v.area}{labels.area}
            </span>
            <span className="text-[13px] font-medium" style={{ color: v.sold ? 'rgb(239 68 68)' : 'rgb(34 197 94)' }}>
              {v.sold ? labels.sold : `$${v.price.toLocaleString('en-US')}`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
