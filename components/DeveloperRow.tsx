'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export type DeveloperRowData = {
  slug: string | null
  name: string
  logoUrl: string | null
  construction: string | null
  reputation: string | null
  equipment: string | null
  management: string | null
}

function parseBullets(s: string | null): string[] | null {
  if (!s) return null
  const trimmed = s.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === 'не известно') return null
  return trimmed
    .split('\n')
    .map(line => line.replace(/^[\s•\-–—·]+/, '').trim())
    .filter(Boolean)
}

function BulletMetric({ title, value }: { title: string; value: string | null }) {
  const bullets = parseBullets(value)
  return (
    <div>
      <div className="text-[15px] font-medium text-[var(--color-text)] mb-2">{title}</div>
      {bullets ? (
        <ul className="text-[14px] text-[var(--color-text-muted)] list-disc pl-5 space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : (
        <div className="text-[14px] italic text-[#9CA3AF]">не известно</div>
      )}
    </div>
  )
}

export function DeveloperRow({ d }: { d: DeveloperRowData }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-2xl hover:shadow-sm transition-shadow">
      <div className="h-24 px-6 py-4 flex items-center gap-5">
        <div className="shrink-0 w-[80px] h-[48px] md:w-[140px] md:h-[56px] flex items-center justify-center p-1">
          {d.logoUrl ? (
            <img
              src={d.logoUrl}
              alt={d.name}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
            />
          ) : (
            <span
              className="text-[16px] font-medium text-[var(--color-text)] truncate"
              style={{ fontFamily: 'serif' }}
            >
              {d.name}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 text-[20px] font-medium text-[var(--color-text)] truncate">
          {d.name}
        </div>

        {d.slug && (
          <Link
            href={`/ru/zastrojshhiki/${d.slug}`}
            className="shrink-0 h-11 px-5 md:px-8 rounded-[10px] bg-[var(--color-primary)] text-white text-[15px] font-medium inline-flex items-center hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Открыть
          </Link>
        )}

        <button
          type="button"
          aria-label={open ? 'Свернуть' : 'Развернуть'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="hidden md:inline-flex shrink-0 w-10 h-10 items-center justify-center text-[#9CA3AF] hover:text-[var(--color-text)]"
        >
          <ChevronDown
            size={24}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && (
        <div className="hidden md:block px-6 pb-5">
          <div className="pt-5 border-t border-[var(--color-border)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <BulletMetric title="Строительство и недвижимость" value={d.construction} />
              <BulletMetric title="Репутация и опыт" value={d.reputation} />
              <BulletMetric title="Техника и производство" value={d.equipment} />
              <BulletMetric title="Управляющая компания" value={d.management} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
