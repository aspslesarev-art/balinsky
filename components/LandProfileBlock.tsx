'use client'

// Collapsible "Земля и зонирование" block for villa / apartment /
// complex detail pages. Compact one-line summary up top + expandable
// full grid below. Data shape mirrors lib/land-profile.ts.

import { useState } from 'react'
import {
  Landmark, ChevronDown, ChevronUp, ExternalLink, CircleCheck, CircleX, CircleAlert,
  FileText, AlertTriangle, ShieldCheck, Hotel, Bed, Utensils, Home as HomeIcon,
  MapPin,
} from 'lucide-react'
import type { UseCaseStatus } from '@/lib/land-profile'

type Tx = Partial<{
  kabupaten: string
  kecamatan: string
  desa: string
  zona_name: string
  subzona_name: string
  gsb_setback: string
  building_height: string
  regulation: string
}>

export type LandProfileProps = {
  lat: number
  lon: number
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
  document_perda_url: string | null
  document_body_url: string | null
  document_verification_url: string | null
  uses_hotel: UseCaseStatus
  uses_villa: UseCaseStatus
  uses_kos: UseCaseStatus
  uses_restaurant: UseCaseStatus
  religious_restrictions: string | null
  zone_homogeneity: 'uniform' | 'mixed' | null
  mixed_zones: string | null
  trust_score: number | null
  translations?: { ru?: Tx; en?: Tx } | null
}

const COPY = {
  ru: {
    title: 'Земля и зонирование',
    summarySub: 'По данным RDTR (Rencana Detail Tata Ruang)',
    expand: 'Подробнее',
    collapse: 'Свернуть',
    str: 'Краткосрочная аренда',
    useCases: 'Use-case по зоне',
    hotel: 'Отель',
    villa: 'Вилла',
    kos: 'Гестхаус / кос',
    restaurant: 'Ресторан',
    kabupaten: 'Кабупатен',
    kecamatan: 'Кечаматан',
    desa: 'Деса',
    zone: 'Зона',
    subzone: 'Подзона',
    kdb: 'KDB (макс. застройка)',
    klb: 'KЛБ (макс. коэф. использования)',
    kdh: 'KDH (зелёная зона)',
    ktb: 'KTB (подвал)',
    gsb: 'Отступы (GSB)',
    height: 'Макс. высота зданий',
    uses: 'Разрешённых видов использования',
    regulation: 'Документ',
    pdfPerda: 'Перда (peta)',
    pdfBody: 'Тело документа',
    pdfVerification: 'Сертификат верификации',
    documents: 'Документы',
    homogeneityUniform: 'Однородная зона',
    homogeneityMixed: 'Стык зон',
    mixedZonesNote: (zones: string) => `Участок попадает в стык зон (${zones}) — рекомендуется ручная проверка`,
    religiousTitle: '🛕 Балийские религиозные ограничения',
    religiousNote: 'Минимум 25 м от деревенских храмов для 1 этажа, 50 м для многоэтажки (Bhisama Kesucian Pura).',
    selfCheckTitle: 'Проверить самостоятельно',
    selfCheckHint: 'Откроется на этой точке в новой вкладке',
    gistaru: 'GISTARU RDTR',
    bhumi: 'BHUMI',
    simtaru: 'SIMTARU Bali',
    threeDatu: '3Datu Badung',
    trustScore: 'Trust score',
    trustHint: 'Сводная оценка достоверности данных от 0 до 100',
    ktbHint: 'На Бали подвалы делают редко из-за грунтовых вод.',
    none: '—',
    strYes: 'легально',
    strNo: 'не легально',
    strMaybe: 'нужна проверка',
    statusAllowed: 'разрешено',
    statusLimited: 'ограничено',
    statusConditional: 'условно',
    statusLimitedConditional: 'огранич. + условно',
    statusForbidden: 'не разрешено',
    statusUnknown: 'нет данных',
  },
  en: {
    title: 'Land & Zoning',
    summarySub: 'From RDTR (Rencana Detail Tata Ruang)',
    expand: 'Show details',
    collapse: 'Hide details',
    str: 'Short-term rental',
    useCases: 'Allowed use-cases',
    hotel: 'Hotel',
    villa: 'Villa',
    kos: 'Guesthouse / kos',
    restaurant: 'Restaurant',
    kabupaten: 'Kabupaten',
    kecamatan: 'Kecamatan',
    desa: 'Desa',
    zone: 'Zone',
    subzone: 'Sub-zone',
    kdb: 'KDB (max footprint)',
    klb: 'KLB (floor-area ratio)',
    kdh: 'KDH (green area)',
    ktb: 'KTB (basement)',
    gsb: 'Setback (GSB)',
    height: 'Max building height',
    uses: 'Permitted use types',
    regulation: 'Regulation',
    pdfPerda: 'Perda (peta)',
    pdfBody: 'Regulation body',
    pdfVerification: 'Verification certificate',
    documents: 'Documents',
    homogeneityUniform: 'Uniform zone',
    homogeneityMixed: 'Zone boundary',
    mixedZonesNote: (zones: string) => `Plot straddles zones (${zones}) — manual review recommended`,
    religiousTitle: '🛕 Balinese religious buffer',
    religiousNote: 'Minimum 25 m from village temples for 1-story buildings, 50 m for multi-story (Bhisama Kesucian Pura).',
    selfCheckTitle: 'Verify yourself',
    selfCheckHint: 'Opens this point in a new tab',
    gistaru: 'GISTARU RDTR',
    bhumi: 'BHUMI',
    simtaru: 'SIMTARU Bali',
    threeDatu: '3Datu Badung',
    trustScore: 'Trust score',
    trustHint: '0–100 aggregate of land-data reliability signals',
    ktbHint: 'Basements are rare in Bali due to groundwater.',
    none: '—',
    strYes: 'allowed',
    strNo: 'not allowed',
    strMaybe: 'verify before buying',
    statusAllowed: 'allowed',
    statusLimited: 'limited',
    statusConditional: 'conditional',
    statusLimitedConditional: 'limited + conditional',
    statusForbidden: 'not allowed',
    statusUnknown: 'no data',
  },
} as const

type Lang = 'ru' | 'en'
// Widen the literal-string properties of COPY['ru'] so EN can also fit.
type CopyShape = { [K in keyof (typeof COPY)['ru']]: (typeof COPY)['ru'][K] extends (...args: infer A) => infer R ? (...args: A) => R : string }

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

const USE_TONE: Record<NonNullable<UseCaseStatus>, 'green' | 'amber' | 'orange' | 'red' | 'gray'> = {
  allowed: 'green',
  limited: 'amber',
  conditional: 'orange',
  limited_conditional: 'red',
  forbidden: 'red',
  unknown: 'gray',
}

function useCaseChip(c: CopyShape, status: UseCaseStatus): { tone: 'green' | 'amber' | 'orange' | 'red' | 'gray'; label: string } {
  if (!status) return { tone: 'gray', label: c.statusUnknown }
  const tone = USE_TONE[status]
  const label =
    status === 'allowed' ? c.statusAllowed :
    status === 'limited' ? c.statusLimited :
    status === 'conditional' ? c.statusConditional :
    status === 'limited_conditional' ? c.statusLimitedConditional :
    status === 'forbidden' ? c.statusForbidden :
    c.statusUnknown
  return { tone, label }
}

function toneClasses(tone: 'green' | 'amber' | 'orange' | 'red' | 'gray'): string {
  switch (tone) {
    case 'green':  return 'bg-[#DCFCE7] text-[#065F46]'
    case 'amber':  return 'bg-[#FEF3C7] text-[#92400E]'
    case 'orange': return 'bg-[#FFEDD5] text-[#9A3412]'
    case 'red':    return 'bg-[#FEE2E2] text-[#991B1B]'
    default:       return 'bg-[#F3F4F6] text-[#374151]'
  }
}

function UseCaseRow({ icon: Icon, label, status, c }: {
  icon: typeof Hotel
  label: string
  status: UseCaseStatus
  c: CopyShape
}) {
  if (!status) return null
  const chip = useCaseChip(c, status)
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-search-bg)]">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-[#111827]">
        <Icon size={14} className="text-[var(--color-text-muted)]" />
        {label}
      </span>
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${toneClasses(chip.tone)}`}>
        {chip.tone === 'green' && <CircleCheck size={11} />}
        {chip.tone === 'red'   && <CircleX size={11} />}
        {(chip.tone === 'amber' || chip.tone === 'orange') && <CircleAlert size={11} />}
        {chip.label}
      </span>
    </div>
  )
}

export function LandProfileBlock({ data, lang = 'ru' }: { data: LandProfileProps; lang?: Lang }) {
  const [open, setOpen] = useState(false)
  const c = COPY[lang]

  const tx = data.translations?.[lang] ?? {}
  const t = (key: keyof Tx, raw: string | null): string | null => tx[key] ?? raw

  // One-line summary: subzone code + (translated) subzone name + STR verdict + facts.
  const subZoneShort = [data.subzona_code, t('subzona_name', data.subzona_name)].filter(Boolean).join(' · ')
  const str = strBadge(data.str_likely_allowed)

  const kecShort = (() => {
    const raw = t('kecamatan', data.kecamatan)
    if (!raw) return null
    return raw.replace(/^(Kecamatan|Кечаматан)\s+/i, '')
  })()

  const facts = [
    kecShort,
    data.kdb_percent != null ? `KDB ${data.kdb_percent}%` : null,
    data.klb_ratio != null ? `KLB ${data.klb_ratio}` : null,
    t('building_height', data.building_height),
  ].filter(Boolean)

  // 3 documents, only those that exist.
  const docs: { label: string; url: string }[] = []
  if (data.document_perda_url) docs.push({ label: c.pdfPerda, url: data.document_perda_url })
  if (data.document_body_url) docs.push({ label: c.pdfBody, url: data.document_body_url })
  if (data.document_verification_url) docs.push({ label: c.pdfVerification, url: data.document_verification_url })
  // Fallback when only `regulation_pdf` is set (older rows).
  if (docs.length === 0 && data.regulation_pdf) {
    docs.push({ label: c.pdfPerda, url: data.regulation_pdf })
  }

  const hasUseCases = !!(data.uses_hotel || data.uses_villa || data.uses_kos || data.uses_restaurant)
  const mixed = data.zone_homogeneity === 'mixed'

  // Self-verification deep-links — open the public viewers at this lat/lon.
  // Formats verified by hitting each site directly. GISTARU and SIMTARU
  // accept lat/lon as query params; BHUMI deep-links land on the map
  // centred on the coordinate; 3Datu only shown for Badung objects.
  const dl = encodeURIComponent(String(data.lat))
  const dln = encodeURIComponent(String(data.lon))
  const links: { label: string; url: string }[] = [
    { label: c.gistaru,  url: `https://gistaru.atrbpn.go.id/rdtrinteraktif/?lat=${dl}&lng=${dln}&zoom=18` },
    { label: c.bhumi,    url: `https://bhumi.atrbpn.go.id/peta?lat=${dl}&lng=${dln}&zoom=18` },
    { label: c.simtaru,  url: `https://simtaru.baliprov.go.id/?lat=${dl}&lng=${dln}` },
  ]
  if (data.kabupaten && /badung/i.test(data.kabupaten)) {
    links.push({ label: c.threeDatu, url: `https://3datu.badungkab.go.id/?lat=${dl}&lng=${dln}` })
  }

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
          <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1 flex items-center gap-2">
            {c.title}
            {data.trust_score != null && (
              <span
                title={c.trustHint}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold normal-case tracking-normal ${
                  data.trust_score >= 70 ? 'bg-[#DCFCE7] text-[#065F46]' :
                  data.trust_score >= 50 ? 'bg-[#FEF3C7] text-[#92400E]' :
                                           'bg-[#FEE2E2] text-[#991B1B]'
                }`}
              >
                <ShieldCheck size={11} /> {c.trustScore} {data.trust_score}
              </span>
            )}
          </div>
          <div className="text-[15px] font-medium text-[#111827]">
            {subZoneShort || (data.zona_name ?? c.none)}
          </div>
          {(facts.length > 0 || str || mixed) && (
            <div className="text-[12.5px] text-[var(--color-text-muted)] mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
              {str && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${toneClasses(
                  str.tone === 'green' ? 'green' : str.tone === 'red' ? 'red' : str.tone === 'amber' ? 'amber' : 'gray'
                )}`}>
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
              {mixed && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${toneClasses('amber')}`}>
                  <AlertTriangle size={11} /> {c.homogeneityMixed}
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
        <div className="border-t border-[var(--color-border)] px-5 py-4 text-[13.5px] space-y-5">
          {hasUseCases && (
            <div>
              <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{c.useCases}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <UseCaseRow icon={Hotel} label={c.hotel} status={data.uses_hotel} c={c} />
                <UseCaseRow icon={HomeIcon} label={c.villa} status={data.uses_villa} c={c} />
                <UseCaseRow icon={Bed} label={c.kos} status={data.uses_kos} c={c} />
                <UseCaseRow icon={Utensils} label={c.restaurant} status={data.uses_restaurant} c={c} />
              </div>
            </div>
          )}

          {mixed && data.mixed_zones && (
            <div className="rounded-lg border border-[#F59E0B]/40 bg-[#FEF3C7] px-3 py-2 text-[12.5px] text-[#78350F]">
              <AlertTriangle size={14} className="inline -mt-0.5 mr-1" />
              {c.mixedZonesNote(data.mixed_zones)}
            </div>
          )}

          {data.religious_restrictions && (
            <div className="rounded-lg border border-[#D4A373]/40 bg-[#FFF7E6] px-3 py-2.5 text-[12.5px] text-[#78350F]">
              <div className="font-semibold mb-1">{c.religiousTitle}</div>
              <div>{c.religiousNote}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {(tx.kabupaten || data.kabupaten) && <Row label={c.kabupaten} value={t('kabupaten', data.kabupaten)!} />}
            {(tx.kecamatan || data.kecamatan) && <Row label={c.kecamatan} value={t('kecamatan', data.kecamatan)!} />}
            {(tx.desa || data.desa) && <Row label={c.desa} value={t('desa', data.desa)!} />}
            {(tx.zona_name || data.zona_name || data.zona_code) && (
              <Row label={c.zone} value={[t('zona_name', data.zona_name), data.zona_code ? `(${data.zona_code})` : null].filter(Boolean).join(' ')} />
            )}
            {(tx.subzona_name || data.subzona_name || data.subzona_code) && (
              <Row label={c.subzone} value={[t('subzona_name', data.subzona_name), data.subzona_code ? `(${data.subzona_code})` : null].filter(Boolean).join(' ')} />
            )}
            {data.kdb_percent != null && <Row label={c.kdb} value={`${data.kdb_percent}%`} />}
            {data.klb_ratio != null && <Row label={c.klb} value={String(data.klb_ratio)} />}
            {data.kdh_percent != null && <Row label={c.kdh} value={`${data.kdh_percent}%`} />}
            {data.ktb_percent != null && <Row label={c.ktb} value={`${data.ktb_percent}%`} hint={c.ktbHint} />}
            {(tx.building_height || data.building_height) && <Row label={c.height} value={t('building_height', data.building_height)!} wide />}
            {(tx.gsb_setback || data.gsb_setback) && <Row label={c.gsb} value={t('gsb_setback', data.gsb_setback)!} wide />}
            {data.allowed_use_count != null && <Row label={c.uses} value={String(data.allowed_use_count)} />}
            {(tx.regulation || data.regulation) && <Row label={c.regulation} value={t('regulation', data.regulation)!} wide />}
          </div>

          {docs.length > 0 && (
            <div>
              <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{c.documents}</div>
              <div className="flex flex-wrap gap-2">
                {docs.map(d => (
                  <a
                    key={d.url}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-search-bg)] border border-[var(--color-border)] text-[12.5px] text-[#111827] hover:border-[var(--color-primary)] no-underline"
                  >
                    <FileText size={12} /> {d.label}
                    <ExternalLink size={11} className="opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{c.selfCheckTitle}</div>
            <div className="flex flex-wrap gap-2">
              {links.map(l => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-[12.5px] text-[#111827] hover:border-[var(--color-primary)] no-underline"
                >
                  <MapPin size={12} /> {l.label}
                  <ExternalLink size={11} className="opacity-50" />
                </a>
              ))}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] mt-1.5">{c.selfCheckHint}</div>
          </div>

          <div className="text-[11.5px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
            {c.summarySub}
          </div>
        </div>
      )}
    </section>
  )
}

function Row({ label, value, wide = false, hint }: { label: string; value: string; wide?: boolean; hint?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[13.5px] text-[#111827] leading-snug" title={hint}>{value}</span>
    </div>
  )
}
