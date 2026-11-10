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

const POSITIONS: Record<number, { x: number; y: number; w: number; h: number }> = {
  1:  { x: 46.5, y: 18.5, w: 22.0, h: 21.0 },
  2:  { x: 38.0, y: 33.0, w: 14.0, h: 18.0 },
  3:  { x: 52.5, y: 33.0, w: 12.0, h: 18.0 },
  4:  { x: 65.0, y: 33.0, w: 14.0, h: 18.0 },
  5:  { x: 38.0, y: 49.0, w: 14.0, h: 17.5 },
  6:  { x: 52.5, y: 49.0, w: 13.0, h: 17.5 },
  7:  { x: 66.0, y: 49.0, w: 14.5, h: 17.5 },
  8:  { x: 38.0, y: 65.0, w: 14.0, h: 19.0 },
  9:  { x: 52.5, y: 65.0, w: 15.5, h: 21.0 },
  10: { x: 68.5, y: 65.0, w: 12.5, h: 23.0 },
}

export function EcoWoodChessBoard({ villas, masterplanUrl, lang }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const villaRoot = lang === 'en' ? '/en/villas/o' : '/ru/villy/o'
  const labels = lang === 'en'
    ? { title: 'Availability', br: 'BR', available: 'Available', sold: 'Sold', area: 'm²', from: 'from' }
    : { title: 'Шахматка', br: 'сп.', available: 'В продаже', sold: 'Продано', area: 'м²', from: 'от' }

  const availableCount = villas.filter(v => !v.sold).length
  const soldCount = villas.filter(v => v.sold).length

  return (
    <div className="mt-8">
      <h3 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
        {labels.title}
      </h3>

      <div className="flex gap-4 mb-4 text-[13px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(34 197 94 / 0.7)' }} />
          {labels.available} ({availableCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(239 68 68 / 0.7)' }} />
          {labels.sold} ({soldCount})
        </span>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-[var(--color-border)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={masterplanUrl}
          alt="EcoWood masterplan"
          className="w-full h-auto block"
          width={1920}
          height={1080}
        />

        {villas.map(v => {
          const pos = POSITIONS[v.unit]
          if (!pos) return null
          const isHovered = hovered === v.unit
          const color = v.sold ? 'rgb(239 68 68)' : 'rgb(34 197 94)'

          return (
            <Link
              key={v.unit}
              href={`${villaRoot}/${v.slug}`}
              className="absolute flex flex-col items-center justify-center transition-all duration-200"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.w}%`,
                height: `${pos.h}%`,
                backgroundColor: isHovered
                  ? (v.sold ? 'rgb(239 68 68 / 0.5)' : 'rgb(34 197 94 / 0.5)')
                  : (v.sold ? 'rgb(239 68 68 / 0.25)' : 'rgb(34 197 94 / 0.25)'),
                border: `2px solid ${color}`,
                borderRadius: '6px',
              }}
              onMouseEnter={() => setHovered(v.unit)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="text-white font-bold drop-shadow-md" style={{ fontSize: 'clamp(12px, 2.5vw, 22px)' }}>
                #{v.unit}
              </span>
              {isHovered && (
                <span
                  className="text-white text-center drop-shadow-md leading-tight"
                  style={{ fontSize: 'clamp(9px, 1.5vw, 13px)' }}
                >
                  {v.bedrooms}{labels.br} · {v.area}{labels.area}
                  <br />
                  ${v.price.toLocaleString('en-US')}
                </span>
              )}
            </Link>
          )
        })}
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
