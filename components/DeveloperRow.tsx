'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { cleanDeveloperBullets } from '@/lib/developer-highlights'
import type { SafetyTier } from '@/lib/developer-safety'

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
  id: {
    ready: 'selesai',
    inprogress: 'sedang berjalan',
    unitsReady: 'unit diserahterimakan',
    unitsInProgress: 'unit dalam pembangunan',
    open: 'Buka',
    expand: 'Perluas',
    collapse: 'Ciutkan',
    unknown: 'tidak ada data',
    construction: 'Konstruksi & properti',
    reputation: 'Reputasi & pengalaman',
    equipment: 'Peralatan & produksi',
    management: 'Perusahaan pengelola',
  },
  fr: {
    ready: 'livré',
    inprogress: 'en cours',
    unitsReady: 'unités livrées',
    unitsInProgress: 'unités en construction',
    open: 'Ouvrir',
    expand: 'Développer',
    collapse: 'Réduire',
    unknown: 'aucune donnée',
    construction: 'Construction & immobilier',
    reputation: 'Réputation & expérience',
    equipment: 'Équipement & production',
    management: 'Société de gestion',
  },
  de: {
    ready: 'fertiggestellt',
    inprogress: 'in Bau',
    unitsReady: 'Einheiten übergeben',
    unitsInProgress: 'Einheiten im Bau',
    open: 'Öffnen',
    expand: 'Aufklappen',
    collapse: 'Zuklappen',
    unknown: 'keine Daten',
    construction: 'Bau & Immobilien',
    reputation: 'Reputation & Erfahrung',
    equipment: 'Technik & Produktion',
    management: 'Verwaltungsgesellschaft',
  },
  zh: {
    ready: '已交付',
    inprogress: '建设中',
    unitsReady: '套已交付',
    unitsInProgress: '套在建',
    open: '打开',
    expand: '展开',
    collapse: '收起',
    unknown: '暂无数据',
    construction: '建设与房产',
    reputation: '信誉与经验',
    equipment: '设备与生产',
    management: '管理公司',
  },
  nl: {
    ready: 'opgeleverd',
    inprogress: 'in aanbouw',
    unitsReady: 'eenheden opgeleverd',
    unitsInProgress: 'eenheden in aanbouw',
    open: 'Openen',
    expand: 'Uitklappen',
    collapse: 'Inklappen',
    unknown: 'geen gegevens',
    construction: 'Bouw & vastgoed',
    reputation: 'Reputatie & ervaring',
    equipment: 'Materieel & productie',
    management: 'Beheermaatschappij',
  },
  ban: {
    ready: 'sampun kaserahang',
    inprogress: 'kantun kagarap',
    unitsReady: 'unit sampun kaserahang',
    unitsInProgress: 'unit kantun kawangun',
    open: 'Buka',
    expand: 'Belat',
    collapse: 'Kbekang',
    unknown: 'nenten wenten data',
    construction: 'Wewangunan & properti',
    reputation: 'Reputasi & pangalaman',
    equipment: 'Piranti & produksi',
    management: 'Perusahaan pangelola',
  },
  pl: {
    ready: 'ukończono',
    inprogress: 'w budowie',
    unitsReady: 'oddanych lokali',
    unitsInProgress: 'lokali w budowie',
    open: 'Otwórz',
    expand: 'Rozwiń',
    collapse: 'Zwiń',
    unknown: 'brak danych',
    construction: 'Budowa i nieruchomości',
    reputation: 'Reputacja i doświadczenie',
    equipment: 'Sprzęt i produkcja',
    management: 'Firma zarządzająca',
  },
  uk: {
    ready: 'завершено',
    inprogress: 'у роботі',
    unitsReady: 'юнітів здано',
    unitsInProgress: 'юнітів будується',
    open: 'Відкрити',
    expand: 'Розгорнути',
    collapse: 'Згорнути',
    unknown: 'немає даних',
    construction: 'Будівництво та нерухомість',
    reputation: 'Репутація та досвід',
    equipment: 'Техніка та виробництво',
    management: 'Керуюча компанія',
  },
} as const

// Safety badge wording. Deliberately descriptive, never accusatory: the badge
// states what we could verify, not a verdict on the company. The "why" behind
// a low tier lives in lib/developer-risk.ts and stays internal.
const SAFETY_COPY: Record<Lang, { title: string; tiers: Record<SafetyTier, string> }> = {
  ru: { title: 'Индекс безопасности: документы, зона земли, сданные объекты, сроки', tiers: {
    high: 'высокая', good: 'выше средней', moderate: 'средняя', low: 'требует проверки', flagged: 'требует проверки', unrated: 'нет данных' } },
  en: { title: 'Safety index: permits, land zoning, delivered projects, deadlines', tiers: {
    high: 'high', good: 'above average', moderate: 'average', low: 'check carefully', flagged: 'check carefully', unrated: 'no data' } },
  id: { title: 'Indeks keamanan: izin, zonasi lahan, proyek diserahkan, tenggat', tiers: {
    high: 'tinggi', good: 'di atas rata-rata', moderate: 'rata-rata', low: 'perlu diperiksa', flagged: 'perlu diperiksa', unrated: 'tanpa data' } },
  fr: { title: 'Indice de sécurité : permis, zonage, projets livrés, délais', tiers: {
    high: 'élevé', good: 'au-dessus de la moyenne', moderate: 'moyen', low: 'à vérifier', flagged: 'à vérifier', unrated: 'sans données' } },
  de: { title: 'Sicherheitsindex: Genehmigungen, Widmung, übergebene Projekte, Termine', tiers: {
    high: 'hoch', good: 'überdurchschnittlich', moderate: 'durchschnittlich', low: 'prüfen', flagged: 'prüfen', unrated: 'keine Daten' } },
  zh: { title: '安全指数：许可、土地分区、已交付项目、工期', tiers: {
    high: '高', good: '高于平均', moderate: '中等', low: '需核查', flagged: '需核查', unrated: '暂无数据' } },
  nl: { title: 'Veiligheidsindex: vergunningen, bestemming, opgeleverde projecten, deadlines', tiers: {
    high: 'hoog', good: 'bovengemiddeld', moderate: 'gemiddeld', low: 'controleren', flagged: 'controleren', unrated: 'geen gegevens' } },
  ban: { title: 'Indeks kaamanan: izin, zonasi tanah, proyek kaserahang, tenggat', tiers: {
    high: 'tegeh', good: 'ring baduur rata-rata', moderate: 'rata-rata', low: 'patut kapriksa', flagged: 'patut kapriksa', unrated: 'nenten wenten data' } },
  pl: { title: 'Indeks bezpieczeństwa: pozwolenia, przeznaczenie gruntu, oddane inwestycje, terminy', tiers: {
    high: 'wysoki', good: 'powyżej średniej', moderate: 'średni', low: 'do sprawdzenia', flagged: 'do sprawdzenia', unrated: 'brak danych' } },
  uk: { title: 'Індекс безпеки: документи, зона землі, здані об’єкти, терміни', tiers: {
    high: 'висока', good: 'вище середньої', moderate: 'середня', low: 'потребує перевірки', flagged: 'потребує перевірки', unrated: 'немає даних' } },
}

const SAFETY_STYLE: Record<SafetyTier, string> = {
  high:     'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  good:     'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  moderate: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  low:      'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
  flagged:  'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
  unrated:  'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]',
}

function SafetyBadge({ tier, score, lang }: { tier: SafetyTier; score: number | null; lang: Lang }) {
  const copy = pickCopy(SAFETY_COPY, lang)
  return (
    <span
      title={copy.title}
      className={`inline-flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${SAFETY_STYLE[tier]}`}
    >
      <span aria-hidden>🛡</span>
      {score != null && <span>{score}</span>}
      <span>{copy.tiers[tier]}</span>
    </span>
  )
}

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
  // Safety index (lib/developer-safety.ts). `safetyScore` is null for the
  // developers we have no portfolio data on — the badge then shows the tier
  // alone rather than a made-up number.
  safetyTier?: SafetyTier
  safetyScore?: number | null
}

function parseBullets(s: string | null, lang: Lang): string[] | null {
  if (!s) return null
  const trimmed = s.trim()
  if (!trimmed) return null
  if (/^(не известно|no data)$/i.test(trimmed)) return null
  const lines = trimmed
    .split('\n')
    .map(line => line.replace(/^[\s•\-–—·]+/, '').trim())
    .filter(Boolean)
  // Drop AI meta-commentary junk and de-Cyrillic any RU last-resort text.
  const cleaned = cleanDeveloperBullets(lines, lang)
  return cleaned.length > 0 ? cleaned : null
}

function BulletMetric({ title, value, unknown, lang }: { title: string; value: string | null; unknown: string; lang: Lang }) {
  const bullets = parseBullets(value, lang)
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
            {/* Name shrinks, badge never does — otherwise a long company name
                pushes the badge past the card edge on narrow screens. */}
            <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
              <div className="min-w-0 text-[15px] sm:text-[18px] md:text-[20px] font-medium text-[var(--color-text)] leading-tight line-clamp-2 sm:line-clamp-1">
                {d.name}
              </div>
              {d.safetyTier && (
                <SafetyBadge tier={d.safetyTier} score={d.safetyScore ?? null} lang={lang} />
              )}
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
              <BulletMetric title={copy.construction} value={d.construction} unknown={copy.unknown} lang={lang} />
              <BulletMetric title={copy.reputation}   value={d.reputation}   unknown={copy.unknown} lang={lang} />
              <BulletMetric title={copy.equipment}    value={d.equipment}    unknown={copy.unknown} lang={lang} />
              <BulletMetric title={copy.management}   value={d.management}   unknown={copy.unknown} lang={lang} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
