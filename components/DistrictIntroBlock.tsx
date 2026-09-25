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
    count: (n: number, name: string) => `Сейчас в каталоге ${n} объектов в районе ${name}. Статус разрешений (PBG, SLF) и зона земли указаны в карточке каждого объекта — проверяйте документы до оплаты.`,
    source: 'Цифры: каталог Balinsky и база аренды, пересчитываются раз в месяц. Все районы —',
    sourceLink: 'цены',
    rentLink: 'аренда',
    sourceHref: '/ru/tseny-na-nedvizhimost-bali',
    rentHref: '/ru/tseny-arendy-na-bali',
  },
  en: {
    guide: (name: string) => `About ${name} — district guide`,
    fullGuide: 'Full Bali investment guide',
    count: (n: number, name: string) => `Currently ${n} properties available in ${name}. Each listing shows its permit status (PBG, SLF) and land zone — check the documents before you pay.`,
    source: 'Figures: Balinsky catalogue and rental database, recalculated monthly. All areas —',
    sourceLink: 'prices',
    rentLink: 'rents',
    sourceHref: '/en/bali-property-prices',
    rentHref: '/en/bali-rent-prices',
  },
  id: {
    guide: (name: string) => `Tentang ${name} — panduan investor`,
    fullGuide: 'Panduan lengkap investasi di Bali',
    count: (n: number, name: string) => `Saat ini ${n} properti tersedia di ${name}. Setiap listing menampilkan status izin (PBG, SLF) dan zona tanah — periksa dokumennya sebelum membayar.`,
    source: 'Angka: katalog Balinsky dan basis data sewa jangka pendek, diperbarui setiap bulan. Metode (dalam bahasa Inggris) —',
    sourceLink: 'tarif sewa vila per area',
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
  },
  fr: {
    guide: (name: string) => `À propos de ${name} — guide du quartier`,
    fullGuide: "Guide complet de l'investissement à Bali",
    count: (n: number, name: string) => `Actuellement ${n} biens disponibles à ${name}. Chaque annonce indique le statut des permis (PBG, SLF) et la zone du terrain — vérifiez les documents avant de payer.`,
    source: 'Chiffres : catalogue Balinsky et base de location courte durée, mis à jour chaque mois. Méthode (en anglais) —',
    sourceLink: 'tarifs de location de villas par secteur',
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
  },
  de: {
    guide: (name: string) => `Über ${name} — Gebietsführer`,
    fullGuide: 'Vollständiger Bali-Investmentguide',
    count: (n: number, name: string) => `Derzeit ${n} Objekte in ${name} verfügbar. Jedes Inserat zeigt den Genehmigungsstatus (PBG, SLF) und die Grundstückszone — prüfen Sie die Dokumente vor der Zahlung.`,
    source: 'Zahlen: Balinsky-Katalog und Kurzzeitmiet-Datenbank, monatlich aktualisiert. Methode (auf Englisch) —',
    sourceLink: 'Villen-Mietpreise nach Gebiet',
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
  },
  zh: {
    guide: (name: string) => `关于 ${name} — 区域指南`,
    fullGuide: '巴厘岛投资完整指南',
    count: (n: number, name: string) => `目前 ${name} 有 ${n} 套房源在售。每套房源都标明许可状态（PBG、SLF）和土地分区——付款前请核实文件。`,
    source: '数据：Balinsky 目录与短租数据库，每月更新。方法（英文）——',
    sourceLink: '各区域别墅租金',
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
  },
  nl: {
    guide: (name: string) => `Over ${name} — wijkgids`,
    fullGuide: 'Volledige Bali-investeringsgids',
    count: (n: number, name: string) => `Momenteel ${n} objecten beschikbaar in ${name}. Elke aanbieding toont de vergunningstatus (PBG, SLF) en de grondzone — controleer de documenten voordat u betaalt.`,
    source: 'Cijfers: Balinsky-catalogus en database voor kortetermijnverhuur, maandelijks bijgewerkt. Methode (in het Engels) —',
    sourceLink: "huurprijzen van villa's per gebied",
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
  },
  ban: {
    guide: (name: string) => `Indik ${name} — panduan wewidangan`,
    fullGuide: 'Panduan jangkep investasi ring Bali',
    count: (n: number, name: string) => `Mangkin wenten ${n} properti ring ${name}. Suang-suang listing nyihnayang status izin (PBG, SLF) lan zona tanah — cek dokumen sadurung mayah.`,
    source: 'Angka: katalog Balinsky lan basis data sewa jangka bawak, kaanyarang sabilang sasih. Metode (basa Inggris) —',
    sourceLink: 'tarif sewa vila manut wewidangan',
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
  },
  pl: {
    guide: (name: string) => `O rejonie ${name} — przewodnik po dzielnicy`,
    fullGuide: 'Pełny przewodnik inwestycyjny po Bali',
    count: (n: number, name: string) => `Obecnie ${n} nieruchomości dostępnych w ${name}. Każda oferta pokazuje status pozwoleń (PBG, SLF) i strefę gruntu — sprawdź dokumenty przed zapłatą.`,
    source: 'Dane: katalog Balinsky i baza najmu krótkoterminowego, aktualizowane co miesiąc. Metoda (po angielsku) —',
    sourceLink: 'stawki najmu willi według okolic',
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
  },
  uk: {
    guide: (name: string) => `Про район ${name} — гід інвестора`,
    fullGuide: 'Повний гід з інвестицій на Балі',
    count: (n: number, name: string) => `Наразі в каталозі ${n} об’єктів у районі ${name}. У картці кожного об’єкта вказано статус дозволів (PBG, SLF) і зону землі — перевіряйте документи до оплати.`,
    source: 'Цифри: каталог Balinsky і база подобової оренди, оновлюються щомісяця. Методика (англійською) —',
    sourceLink: 'ставки оренди віл за районами',
    sourceHref: '/en/knowledge/bali-villa-rental-rates-by-area-2026',
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
      <p className="-mt-3 mb-6 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
        {t.source}{' '}
        <Link href={t.sourceHref} className="underline underline-offset-2 hover:no-underline">{t.sourceLink}</Link>
        {'rentHref' in t && (
          <>
            {' · '}
            <Link href={t.rentHref} className="underline underline-offset-2 hover:no-underline">{t.rentLink}</Link>
          </>
        )}
      </p>

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
