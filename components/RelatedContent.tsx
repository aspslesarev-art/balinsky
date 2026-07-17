// Shared "related entities" block for content detail pages (news / promo /
// events): a clickable developer card, a clickable complex card, and the
// complex's unit cards — surfaced under the article body. Everything is
// resolved best-effort; each sub-block only renders when we're confident.
import Link from 'next/link'
import Image from 'next/image'
import { Building2, HardHat, ChevronRight } from 'lucide-react'
import { StarRating } from '@/components/StarRating'
import { VillaCard } from '@/components/VillaCard'
import { ApartmentCard } from '@/components/ApartmentCard'
import { complexSlugByName, complexSlugForText, complexNameBySlug } from '@/lib/complex-index'
import { loadUnitsForComplex } from '@/lib/complex-units'
import { developerLogoBySlug } from '@/lib/developer-logo'
import { reliabilityForDeveloper } from '@/lib/developer-reliability'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

export type RelatedDeveloper = { name: string; slug: string | null }

const COPY = {
  ru: {
    developerHeading: 'Застройщик',
    builtBy: 'Застройщик',
    viewDeveloper: 'Смотреть застройщика',
    allDevelopers: 'Все застройщики',
    complexHeading: 'Жилой комплекс',
    viewComplex: 'Смотреть комплекс',
    unitsHeading: 'Объекты этого комплекса',
    reliability: (n: number) => `надёжность Balinsky · ${n} сданных`,
  },
  en: {
    developerHeading: 'Developer',
    builtBy: 'Developer',
    viewDeveloper: 'View developer',
    allDevelopers: 'All developers',
    complexHeading: 'Residential complex',
    viewComplex: 'View complex',
    unitsHeading: 'Units in this complex',
    reliability: (n: number) => `Balinsky reliability · ${n} completed`,
  },
  id: {
    developerHeading: 'Pengembang',
    builtBy: 'Pengembang',
    viewDeveloper: 'Lihat pengembang',
    allDevelopers: 'Semua pengembang',
    complexHeading: 'Kompleks hunian',
    viewComplex: 'Lihat kompleks',
    unitsHeading: 'Unit di kompleks ini',
    reliability: (n: number) => `keandalan Balinsky · ${n} selesai`,
  },
  fr: {
    developerHeading: 'Promoteur',
    builtBy: 'Promoteur',
    viewDeveloper: 'Voir le promoteur',
    allDevelopers: 'Tous les promoteurs',
    complexHeading: 'Résidence',
    viewComplex: 'Voir la résidence',
    unitsHeading: 'Biens de cette résidence',
    reliability: (n: number) => `fiabilité Balinsky · ${n} livrés`,
  },
  de: {
    developerHeading: 'Bauträger',
    builtBy: 'Bauträger',
    viewDeveloper: 'Bauträger ansehen',
    allDevelopers: 'Alle Bauträger',
    complexHeading: 'Wohnanlage',
    viewComplex: 'Wohnanlage ansehen',
    unitsHeading: 'Einheiten in dieser Wohnanlage',
    reliability: (n: number) => `Balinsky-Zuverlässigkeit · ${n} fertiggestellt`,
  },
  zh: {
    developerHeading: '开发商',
    builtBy: '开发商',
    viewDeveloper: '查看开发商',
    allDevelopers: '所有开发商',
    complexHeading: '住宅区',
    viewComplex: '查看住宅区',
    unitsHeading: '此住宅区的房源',
    reliability: (n: number) => `Balinsky 可靠度 · ${n} 套已交付`,
  },
  nl: {
    developerHeading: 'Ontwikkelaar',
    builtBy: 'Ontwikkelaar',
    viewDeveloper: 'Ontwikkelaar bekijken',
    allDevelopers: 'Alle ontwikkelaars',
    complexHeading: 'Wooncomplex',
    viewComplex: 'Wooncomplex bekijken',
    unitsHeading: 'Objecten in dit wooncomplex',
    reliability: (n: number) => `Balinsky-betrouwbaarheid · ${n} opgeleverd`,
  },
  ban: {
    developerHeading: 'Pangwangun',
    builtBy: 'Pangwangun',
    viewDeveloper: 'Cingak pangwangun',
    allDevelopers: 'Sami pangwangun',
    complexHeading: 'Kompleks hunian',
    viewComplex: 'Cingak kompleks',
    unitsHeading: 'Unit ring kompleks puniki',
    reliability: (n: number) => `keandalan Balinsky · ${n} puput`,
  },
} as const

export async function RelatedContent({
  lang,
  developers,
  complexNames,
  title,
}: {
  lang: Lang
  developers: RelatedDeveloper[]
  complexNames: string[]
  title: string
}) {
  const c = pickCopy(COPY, lang)
  const dev = developers?.find(d => d.name?.trim()) ?? null

  // Hidden developers must not surface anywhere — suppress the whole block,
  // since the complex/units below belong to that same developer.
  if (dev && isHiddenDeveloper(dev.name)) return null

  // Resolve a complex with confidence: exact name match first, then a
  // longest-substring match against the title. Only a resolved slug lets us
  // pull the canonical Project name and match units — complexNames often
  // carries a developer name, which would match the wrong units.
  const exactName = complexNames?.find(n => n?.trim()) ?? null
  const complexSlug =
    (await complexSlugByName(exactName)) ??
    (await complexSlugForText(title, ...(complexNames ?? [])))
  const complexName = complexSlug ? (await complexNameBySlug(complexSlug)) ?? exactName : null

  const [logoUrl, reliability, units] = await Promise.all([
    dev?.slug ? developerLogoBySlug(dev.slug) : Promise.resolve(null),
    dev?.name ? reliabilityForDeveloper(dev.name) : Promise.resolve(null),
    complexName ? loadUnitsForComplex(complexName, lang) : Promise.resolve([]),
  ])

  const showComplex = !!(complexSlug && complexName)
  if (!dev && !showComplex && units.length === 0) return null

  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)
  const complexesRoot = switchLangPath('/ru/zhilye-kompleksy', lang)

  return (
    <div className="mt-14 space-y-12">
      {dev && (
        <section>
          <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
            {c.developerHeading}
          </h2>
          {dev.slug ? (
            <Link
              href={`${developersRoot}/${dev.slug}`}
              className="group flex items-center gap-4 bg-white rounded-2xl border border-[var(--color-border)] p-5 max-w-3xl hover:border-[var(--color-primary)] transition-colors no-underline"
            >
              <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-2">
                {logoUrl ? (
                  <Image src={logoUrl} alt={dev.name} width={56} height={56} className="max-w-full max-h-full object-contain" />
                ) : (
                  <HardHat size={28} className="text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{c.builtBy}</div>
                <div className="text-[19px] font-semibold text-[#111827] truncate">{dev.name}</div>
                {reliability && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <StarRating value={reliability.score} size={14} />
                    <span className="text-[13px] font-semibold text-[#111827]">{reliability.score.toFixed(1)}</span>
                    <span className="text-[12px] text-[var(--color-text-muted)]">{c.reliability(reliability.completed)}</span>
                  </div>
                )}
                <div className="mt-1 text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {c.viewDeveloper} <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 max-w-3xl">
              <div className="text-[13px] text-[var(--color-text-muted)] mb-1">{c.builtBy}</div>
              <div className="text-[20px] font-semibold text-[#111827] mb-3">{dev.name}</div>
              <Link href={developersRoot} className="inline-flex items-center gap-1 text-[14px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)]">
                {c.allDevelopers} <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </section>
      )}

      {showComplex && (
        <section>
          <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
            {c.complexHeading}
          </h2>
          <Link
            href={`${complexesRoot}/o/${complexSlug}`}
            className="group flex items-center gap-4 bg-white rounded-2xl border border-[var(--color-border)] p-5 max-w-3xl hover:border-[var(--color-primary)] transition-colors no-underline"
          >
            <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center">
              <Building2 size={28} className="text-[var(--color-text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{c.complexHeading}</div>
              <div className="text-[19px] font-semibold text-[#111827] truncate">{complexName}</div>
              <div className="mt-1 text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                {c.viewComplex} <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        </section>
      )}

      {units.length > 0 && (
        <section>
          <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.unitsHeading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {units.map(u =>
              u.kind === 'villa'
                ? <VillaCard key={u.id} a={u} lang={lang} />
                : <ApartmentCard key={u.id} a={u} lang={lang} />,
            )}
          </div>
        </section>
      )}
    </div>
  )
}
