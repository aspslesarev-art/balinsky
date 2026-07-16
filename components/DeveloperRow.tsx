'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    ready: 'сдано',
    inprogress: 'в работе',
    unitsReady: 'юнитов сдано',
    unitsInProgress: 'юнитов строится',
    open: 'Открыть',
    expand: 'Развернуть',
    collapse: 'Свернуть',
    unknown: 'не известно',
    construction: 'Строительство и недвижимость',
    reputation: 'Репутация и опыт',
    equipment: 'Техника и производство',
    management: 'Управляющая компания',
  },
  en: {
    ready: 'completed',
    inprogress: 'in progress',
    unitsReady: 'units delivered',
    unitsInProgress: 'units under construction',
    open: 'Open',
    expand: 'Expand',
    collapse: 'Collapse',
    unknown: 'no data',
    construction: 'Construction & real estate',
    reputation: 'Reputation & experience',
    equipment: 'Equipment & production',
    management: 'Management company',
  },
} as const

export type DeveloperRowData = {
  slug: string | null
  name: string
  logoUrl: string | null
  construction: string | null
  reputation: string | null
  equipment: string | null
  management: string | null
  // Catalog stats — show on the card and drive the sort order.
  complexesReady?: number
  complexesTotal?: number
  // Unit-level totals across the developer's complexes. Two builders
  // with the same number of complexes can carry vastly different
  // construction obligations (5 villas vs 600-unit tower); these
  // numbers expose that asymmetry.
  unitsReady?: number
  unitsTotal?: number
}

function parseBullets(s: string | null): string[] | null {
  if (!s) return null
  const trimmed = s.trim()
  if (!trimmed) return null
  if (/^(не известно|no data)$/i.test(trimmed)) return null
  return trimmed
    .split('\n')
    .map(line => line.replace(/^[\s•\-–—·]+/, '').trim())
    .filter(Boolean)
}

function BulletMetric({ title, value, unknown }: { title: string; value: string | null; unknown: string }) {
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
        <div className="text-[14px] italic text-[#9CA3AF]">{unknown}</div>
      )}
    </div>
  )
}

export function DeveloperRow({ d, lang = 'ru' }: { d: DeveloperRowData; lang?: Lang }) {
  const [open, setOpen] = useState(false)
  const copy = pickCopy(COPY, lang)
  const detailHref = switchLangPath(`/ru/zastrojshhiki/${d.slug}`, lang)

  return (
    <div className="w-full bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-2xl hover:shadow-sm transition-shadow">
      <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        {/* Top row on mobile: logo + name. Inline on sm+. The whole
            developer block toggles the details panel; the green "Open"
            link (a sibling, not nested here) still navigates to the page. */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="flex items-center gap-3 sm:gap-5 min-w-0 w-full sm:w-auto sm:flex-1 text-left cursor-pointer"
        >
          <div className="shrink-0 w-[56px] h-[40px] sm:w-[100px] sm:h-[48px] md:w-[140px] md:h-[56px] flex items-center justify-center p-1">
            {d.logoUrl ? (
              <Image
                src={d.logoUrl}
                alt={d.name}
                width={140}
                height={56}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <span
                className="text-[13px] sm:text-[16px] font-medium text-[var(--color-text)] truncate"
                style={{ fontFamily: 'serif' }}
              >
                {d.name}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[15px] sm:text-[18px] md:text-[20px] font-medium text-[var(--color-text)] leading-tight line-clamp-2 sm:line-clamp-1">
              {d.name}
            </div>
            {(d.complexesReady != null || d.complexesTotal != null) && (d.complexesTotal ?? 0) > 0 && (
              <div className="mt-1 text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                {d.complexesReady != null && d.complexesReady > 0 && (
                  <span className="text-[var(--color-primary-pressed)] font-medium">{d.complexesReady} {copy.ready}</span>
                )}
                {d.complexesReady != null && d.complexesReady > 0 && (d.complexesTotal ?? 0) - (d.complexesReady ?? 0) > 0 && (
                  <span className="mx-1.5">·</span>
                )}
                {(d.complexesTotal ?? 0) - (d.complexesReady ?? 0) > 0 && (
                  <span>{(d.complexesTotal ?? 0) - (d.complexesReady ?? 0)} {copy.inprogress}</span>
                )}
              </div>
            )}
            {/* Second stats line: actual unit counts. Surfaces the
                asymmetry between "10 small villa projects" and
                "2 large complexes" — same complex count, very
                different construction load. Shown only when at
                least one of the unit totals is non-zero. */}
            {((d.unitsReady ?? 0) > 0 || ((d.unitsTotal ?? 0) - (d.unitsReady ?? 0)) > 0) && (
              <div className="mt-0.5 text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                {(d.unitsReady ?? 0) > 0 && (
                  <span className="text-[var(--color-primary-pressed)] font-medium">{d.unitsReady} {copy.unitsReady}</span>
                )}
                {(d.unitsReady ?? 0) > 0 && ((d.unitsTotal ?? 0) - (d.unitsReady ?? 0)) > 0 && (
                  <span className="mx-1.5">·</span>
                )}
                {((d.unitsTotal ?? 0) - (d.unitsReady ?? 0)) > 0 && (
                  <span>{(d.unitsTotal ?? 0) - (d.unitsReady ?? 0)} {copy.unitsInProgress}</span>
                )}
              </div>
            )}
          </div>
        </button>

        {/* Actions: full-width row on mobile, inline on sm+ */}
        <div className="flex items-center gap-2 sm:gap-3 sm:shrink-0">
          {d.slug && (
            <Link
              href={detailHref}
              className="flex-1 sm:flex-initial h-10 sm:h-11 px-4 sm:px-6 md:px-8 rounded-[10px] bg-[var(--color-primary)] text-white text-[14px] sm:text-[15px] font-medium inline-flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              {copy.open}
            </Link>
          )}

          <button
            type="button"
            aria-label={open ? copy.collapse : copy.expand}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            className="inline-flex shrink-0 w-10 h-10 items-center justify-center text-[#9CA3AF] hover:text-[var(--color-text)]"
          >
            <ChevronDown
              size={22}
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-6 pb-5">
          <div className="pt-5 border-t border-[var(--color-border)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
              <BulletMetric title={copy.construction} value={d.construction} unknown={copy.unknown} />
              <BulletMetric title={copy.reputation}   value={d.reputation}   unknown={copy.unknown} />
              <BulletMetric title={copy.equipment}    value={d.equipment}    unknown={copy.unknown} />
              <BulletMetric title={copy.management}   value={d.management}   unknown={copy.unknown} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
