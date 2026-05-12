'use client'

// Collapsible "Земля и зонирование" block for villa / apartment /
// complex detail pages. Compact one-line summary up top + expandable
// full grid below. Data shape mirrors lib/land-profile.ts.

import { useState } from 'react'
import { Landmark, ChevronDown, ChevronUp, ExternalLink, CircleCheck, CircleX, CircleAlert } from 'lucide-react'

export type LandProfileProps = {
  kabupaten: string | null
  kecamatan: string | null
  desa: string | null
  zona_name: string | null
  zona_code: string | null
  subzona_name: string | null
  subzona_code: string | null
  kdb_percent: number | null
  klb_ratio: number | null
  kdh_percent: number | null
  ktb_percent: number | null
  gsb_setback: string | null
  building_height: string | null
  allowed_use_count: number | null
  regulation: string | null
  regulation_pdf: string | null
  str_likely_allowed: string | null
}

const COPY = {
  ru: {
    title: 'Земля и зонирование',
    summarySub: 'По данным RDTR (Rencana Detail Tata Ruang)',
    expand: 'Подробнее',
    collapse: 'Свернуть',
    str: 'Краткосрочная аренда',
    kabupaten: 'Кабупатен',
    kecamatan: 'Кечаматан',
    desa: 'Деса',
    zone: 'Зона',
    subzone: 'Подзона',
    kdb: 'KDB (макс. застройка)',
    klb: 'KLB (этажность)',
    kdh: 'KDH (зелёная зона)',
    ktb: 'KTB (подвал)',
    gsb: 'Отступы (GSB)',
    height: 'Макс. высота зданий',
    uses: 'Разрешённых видов использования',
    regulation: 'Документ',
    pdfLink: 'Открыть PDF',
    none: '—',
    strYes: 'легально',
    strNo: 'не легально',
    strMaybe: 'нужна проверка',
  },
  en: {
    title: 'Land & Zoning',
    summarySub: 'From RDTR (Rencana Detail Tata Ruang)',
    expand: 'Show details',
    collapse: 'Hide details',
    str: 'Short-term rental',
    kabupaten: 'Kabupaten',
    kecamatan: 'Kecamatan',
    desa: 'Desa',
    zone: 'Zone',
    subzone: 'Sub-zone',
    kdb: 'KDB (max footprint)',
    klb: 'KLB (FAR)',
    kdh: 'KDH (green area)',
    ktb: 'KTB (basement)',
    gsb: 'Setback (GSB)',
    height: 'Max building height',
    uses: 'Permitted use types',
    regulation: 'Regulation',
    pdfLink: 'Open PDF',
    none: '—',
    strYes: 'allowed',
    strNo: 'not allowed',
    strMaybe: 'verify before buying',
  },
} as const

function strBadge(raw: string | null): { tone: 'green' | 'red' | 'amber' | 'gray'; short: string; full: string } | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower.startsWith('likely yes') || lower.startsWith('yes')) {
    return { tone: 'green', short: '✓', full: raw }
  }
  if (lower.startsWith('no')) {
    return { tone: 'red', short: '✗', full: raw }
  }
  if (lower.startsWith('probably no')) {
    return { tone: 'amber', short: '?', full: raw }
  }
  return { tone: 'gray', short: '?', full: raw }
}

export function LandProfileBlock({ data, lang = 'ru' }: { data: LandProfileProps; lang?: 'ru' | 'en' }) {
  const [open, setOpen] = useState(false)
  const c = COPY[lang]

  // One-line summary: subzone code + subzone name + STR verdict + KDB/KLB
  const subZoneShort = [data.subzona_code, data.subzona_name].filter(Boolean).join(' · ')
  const str = strBadge(data.str_likely_allowed)

  const facts = [
    data.kecamatan ? data.kecamatan.replace(/^Kecamatan\s+/i, '') : null,
    data.kdb_percent != null ? `KDB ${data.kdb_percent}%` : null,
    data.klb_ratio != null ? `KLB ${data.klb_ratio}` : null,
    data.building_height ? `${data.building_height}` : null,
  ].filter(Boolean)

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[var(--color-search-bg)] transition-colors"
        aria-expanded={open}
      >
        <Landmark size={18} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
            {c.title}
          </div>
          <div className="text-[15px] font-medium text-[#111827]">
            {subZoneShort || (data.zona_name ?? c.none)}
          </div>
          {(facts.length > 0 || str) && (
            <div className="text-[12.5px] text-[var(--color-text-muted)] mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
              {str && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  str.tone === 'green' ? 'bg-[#DCFCE7] text-[#065F46]' :
                  str.tone === 'red'   ? 'bg-[#FEE2E2] text-[#991B1B]' :
                  str.tone === 'amber' ? 'bg-[#FEF3C7] text-[#92400E]' :
                                         'bg-[#F3F4F6] text-[#374151]'
                }`}>
                  {str.tone === 'green' && <CircleCheck size={11} />}
                  {str.tone === 'red'   && <CircleX size={11} />}
                  {str.tone === 'amber' && <CircleAlert size={11} />}
                  {c.str}: {
                    str.tone === 'green' ? c.strYes :
                    str.tone === 'red'   ? c.strNo :
                    str.tone === 'amber' ? c.strNo :
                                           c.strMaybe
                  }
                </span>
              )}
              {facts.map(f => <span key={f}>{f}</span>)}
            </div>
          )}
        </div>
        <span className="text-[12px] text-[var(--color-primary)] font-medium inline-flex items-center gap-0.5 shrink-0 mt-1">
          {open ? c.collapse : c.expand}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] px-5 py-4 text-[13.5px] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {data.kabupaten && <Row label={c.kabupaten} value={data.kabupaten} />}
          {data.kecamatan && <Row label={c.kecamatan} value={data.kecamatan} />}
          {data.desa && <Row label={c.desa} value={data.desa} />}
          {(data.zona_name || data.zona_code) && (
            <Row label={c.zone} value={[data.zona_name, data.zona_code ? `(${data.zona_code})` : null].filter(Boolean).join(' ')} />
          )}
          {(data.subzona_name || data.subzona_code) && (
            <Row label={c.subzone} value={[data.subzona_name, data.subzona_code ? `(${data.subzona_code})` : null].filter(Boolean).join(' ')} />
          )}
          {data.kdb_percent != null && <Row label={c.kdb} value={`${data.kdb_percent}%`} />}
          {data.klb_ratio != null && <Row label={c.klb} value={String(data.klb_ratio)} />}
          {data.kdh_percent != null && <Row label={c.kdh} value={`${data.kdh_percent}%`} />}
          {data.ktb_percent != null && <Row label={c.ktb} value={`${data.ktb_percent}%`} />}
          {data.building_height && <Row label={c.height} value={data.building_height} />}
          {data.gsb_setback && <Row label={c.gsb} value={data.gsb_setback} wide />}
          {data.allowed_use_count != null && <Row label={c.uses} value={String(data.allowed_use_count)} />}
          {data.regulation && <Row label={c.regulation} value={data.regulation} wide />}
          {data.regulation_pdf && (
            <div className="sm:col-span-2">
              <a
                href={data.regulation_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)]"
              >
                <ExternalLink size={12} /> {c.pdfLink}
              </a>
            </div>
          )}
          <div className="sm:col-span-2 text-[11.5px] text-[var(--color-text-muted)] mt-2 pt-2 border-t border-[var(--color-border)]">
            {c.summarySub}
          </div>
        </div>
      )}
    </section>
  )
}

function Row({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[13.5px] text-[#111827] leading-snug">{value}</span>
    </div>
  )
}
