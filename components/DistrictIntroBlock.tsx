// Renders the rich SEO intro shown above the property grid on
// single-district filter pages (`/ru/villy/canggu`, `/en/villas/uluwatu`
// etc.). Only mounts when getDistrictCopy returns a payload; the
// catalog falls back to its default header otherwise.

import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import type { DistrictCopy } from '@/lib/districts'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    guide: (name: string) => `О районе ${name} — гид инвестора`,
    fullGuide: 'Полный гайд по инвестициям на Бали',
    count: (n: number, name: string) => `Сейчас в каталоге ${n} объектов в районе ${name}. Каждый прошёл редакторский QA — PBG, SLF, регистрация застройщика и проверка на месте.`,
  },
  en: {
    guide: (name: string) => `About ${name} — district guide`,
    fullGuide: 'Full Bali investment guide',
    count: (n: number, name: string) => `Currently ${n} properties available in ${name}. Each listing passed our editorial QA — PBG, SLF, developer registration and on-the-ground verification.`,
  },
  id: {
    guide: (name: string) => `Tentang ${name} — panduan investor`,
    fullGuide: 'Panduan lengkap investasi di Bali',
    count: (n: number, name: string) => `Saat ini ${n} properti tersedia di ${name}. Setiap listing lolos QA editorial kami — PBG, SLF, registrasi pengembang, dan verifikasi di lokasi.`,
  },
  fr: {
    guide: (name: string) => `À propos de ${name} — guide du quartier`,
    fullGuide: "Guide complet de l'investissement à Bali",
    count: (n: number, name: string) => `Actuellement ${n} biens disponibles à ${name}. Chaque annonce a passé notre contrôle qualité éditorial — PBG, SLF, enregistrement du promoteur et vérification sur place.`,
  },
  de: {
    guide: (name: string) => `Über ${name} — Gebietsführer`,
    fullGuide: 'Vollständiger Bali-Investmentguide',
    count: (n: number, name: string) => `Derzeit ${n} Objekte in ${name} verfügbar. Jedes Inserat hat unsere redaktionelle QA bestanden — PBG, SLF, Bauträger-Registrierung und Prüfung vor Ort.`,
  },
  zh: {
    guide: (name: string) => `关于 ${name} — 区域指南`,
    fullGuide: '巴厘岛投资完整指南',
    count: (n: number, name: string) => `目前 ${name} 有 ${n} 套房源在售。每套房源均通过我们的编辑质检——PBG、SLF、开发商注册及实地核验。`,
  },
  nl: {
    guide: (name: string) => `Over ${name} — wijkgids`,
    fullGuide: 'Volledige Bali-investeringsgids',
    count: (n: number, name: string) => `Momenteel ${n} objecten beschikbaar in ${name}. Elke aanbieding doorstond onze redactionele QA — PBG, SLF, ontwikkelaarsregistratie en verificatie ter plaatse.`,
  },
  ban: {
    guide: (name: string) => `Indik ${name} — panduan wewidangan`,
    fullGuide: 'Panduan jangkep investasi ring Bali',
    count: (n: number, name: string) => `Mangkin wenten ${n} properti ring ${name}. Suang-suang listing sampun lulus QA editorial — PBG, SLF, registrasi pangwangun, lan verifikasi ring genah.`,
  },
  pl: {
    guide: (name: string) => `O rejonie ${name} — przewodnik po dzielnicy`,
    fullGuide: 'Pełny przewodnik inwestycyjny po Bali',
    count: (n: number, name: string) => `Obecnie ${n} nieruchomości dostępnych w ${name}. Każda oferta przeszła naszą redakcyjną kontrolę jakości — PBG, SLF, rejestrację dewelopera i weryfikację na miejscu.`,
  },
  uk: {
    guide: (name: string) => `Про район ${name} — гід інвестора`,
    fullGuide: 'Повний гід з інвестицій на Балі',
    count: (n: number, name: string) => `Наразі в каталозі ${n} об’єктів у районі ${name}. Кожен пройшов редакторський QA — PBG, SLF, реєстрація забудовника та перевірка на місці.`,
  },
} as const

export function DistrictIntroBlock({
  copy,
  lang,
  totalCount,
}: {
  copy: DistrictCopy
  lang: Lang
  totalCount: number
  sectionRoot: string
}) {
  const t = pickCopy(COPY, lang)
  const pillarHref = switchLangPath('/ru/investicii-v-nedvizhimost-bali', lang)
  return (
    <section className="mt-2 mb-8 max-w-4xl">
      <p className="text-[16px] md:text-[17px] text-[var(--color-text-muted)] leading-relaxed mb-5">
        {copy.hero}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {copy.highlights.map(h => (
          <div key={h.label} className="rounded-xl border border-[var(--color-border)] p-3 bg-white">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{h.label}</div>
            <div className="text-[16px] font-semibold text-[#111827]">{h.value}</div>
          </div>
        ))}
      </div>

      <details className="rounded-2xl border border-[var(--color-border)] p-4 bg-white mb-6 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-[15px] font-semibold text-[#111827]">
          <span>{t.guide(copy.name)}</span>
          <ChevronRight size={18} className="shrink-0 transition-transform [details[open]_&]:rotate-90" />
        </summary>
        <div className="space-y-3 text-[14px] leading-[1.7] text-[#1f2937]">
          {copy.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {copy.bestFor.map(tag => (
            <span key={tag} className="inline-block text-[12px] text-[var(--color-text-muted)] bg-[var(--color-search-bg)] rounded-full px-3 py-1">{tag}</span>
          ))}
        </div>
        <div className="mt-4 text-[13px]">
          <Link href={pillarHref} className="inline-flex items-center gap-1 text-[var(--color-primary)] no-underline hover:underline">
            <TrendingUp size={14} />
            {t.fullGuide}
          </Link>
        </div>
      </details>

      <p className="text-[14px] text-[var(--color-text-muted)]">
        {t.count(totalCount, copy.name)}
      </p>
    </section>
  )
}
