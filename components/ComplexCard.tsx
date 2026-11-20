'use client'

import { VerifiedYieldBadge } from './VerifiedYieldBadge'
import Link from 'next/link'
import { ProgressBar } from './ProgressBar'
import { ComplexYieldPro } from './CardYieldPro'
import type { ComplexYieldRange } from '@/lib/investment/chance'
import { PhotoSlider } from './PhotoSlider'
import { useCurrency } from './CurrencyContext'
import { WishlistButton } from './WishlistButton'
import { formatPrice } from '@/lib/currency'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { facetLabel } from '@/lib/filter-i18n'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'

export type ComplexCardData = {
  /** Комплекс сам на Booking — доходность по его реальным цифрам. */
  verifiedYield?: boolean
  slug: string
  name: string
  location: string | null
  types: string | null
  permit: string | null
  readiness: number
  coverUrl: string | null
  photos: string[]
  photoCount: number
  villaPriceFrom: number | null
  villaPriceTo: number | null
  aptPriceFrom: number | null
  aptPriceTo: number | null
  // Editor-flagged: every unit in the complex is sold. Renders a red
  // "Продано" / "Sold" pill on the cover photo.
  isSold?: boolean
  /** Pro: доход юнитов «от и до» и разброс вероятности (CardYieldPro). */
  yieldRange?: ComplexYieldRange | null
}

const COPY = {
  ru: { villas: 'Виллы', apartments: 'Апартаменты', permit: 'Разрешение на строительство (PBG)', slf: 'Ввод в эксплуатацию (SLF)', applied: 'подана заявка', has: 'есть', noPermit: 'нет данных', readiness: 'Готовность строительства', from: 'от', to: 'до', sold: 'Продано' },
  en: { villas: 'Villas', apartments: 'Apartments', permit: 'Building permit (PBG)', slf: 'Occupancy certificate (SLF)', applied: 'applied for', has: 'yes', noPermit: 'no data', readiness: 'Construction progress', from: 'from', to: 'to', sold: 'Sold' },
  id: { villas: 'Vila', apartments: 'Apartemen', permit: 'Persetujuan bangunan (PBG)', slf: 'Sertifikat Laik Fungsi (SLF)', applied: 'sedang diajukan', has: 'ada', noPermit: 'tidak ada data', readiness: 'Kemajuan konstruksi', from: 'dari', to: 'sampai', sold: 'Terjual' },
  fr: { villas: 'Villas', apartments: 'Appartements', permit: 'Permis de construire (PBG)', slf: 'Certificat de conformité (SLF)', applied: 'demande déposée', has: 'obtenu', noPermit: 'non renseigné', readiness: 'Avancement des travaux', from: 'de', to: 'à', sold: 'Vendu' },
  de: { villas: 'Villen', apartments: 'Apartments', permit: 'Baugenehmigung (PBG)', slf: 'Nutzungsgenehmigung (SLF)', applied: 'beantragt', has: 'erteilt', noPermit: 'keine Angaben', readiness: 'Baufortschritt', from: 'ab', to: 'bis', sold: 'Verkauft' },
  zh: { villas: '别墅', apartments: '公寓', permit: '建筑许可 (PBG)', slf: '使用许可证 (SLF)', applied: '已申请', has: '已取得', noPermit: '暂无数据', readiness: '施工进度', from: '从', to: '至', sold: '已售' },
  nl: { villas: "Villa's", apartments: 'Appartementen', permit: 'Bouwvergunning (PBG)', slf: 'Gebruiksvergunning (SLF)', applied: 'aangevraagd', has: 'verleend', noPermit: 'geen gegevens', readiness: 'Bouwvoortgang', from: 'vanaf', to: 'tot', sold: 'Verkocht' },
  ban: { villas: 'Vila', apartments: 'Apartemen', permit: 'Izin ngwangun bangunan (PBG)', slf: 'Sertifikat Laik Fungsi (SLF)', applied: 'sampun kaajuang', has: 'wenten', noPermit: 'nenten wenten data', readiness: 'Kamajuan konstruksi', from: 'saking', to: 'kantos', sold: 'Sampun kaadol' },
  pl: { villas: 'Wille', apartments: 'Apartamenty', permit: 'Pozwolenie na budowę (PBG)', slf: 'Pozwolenie na użytkowanie (SLF)', applied: 'złożono wniosek', has: 'jest', noPermit: 'brak danych', readiness: 'Postęp budowy', from: 'od', to: 'do', sold: 'Sprzedane' },
  uk: { villas: 'Вілли', apartments: 'Апартаменти', permit: 'Дозвіл на будівництво (PBG)', slf: 'Введення в експлуатацію (SLF)', applied: 'подано заявку', has: 'є', noPermit: 'немає даних', readiness: 'Хід будівництва', from: 'від', to: 'до', sold: 'Продано' },
} as const

// «Разрешительные документы»: PBG — разрешение на стройку, SLF — ввод в
// эксплуатацию (это не разрешение на строительство). «нет» в поле — значение
// по умолчанию, а не ответ застройщика, поэтому показываем «нет данных».
function permitLine(raw: string | null, copy: { permit: string; slf: string; applied: string; has: string; noPermit: string }, lang: Lang): string {
  const v = (raw ?? '').trim()
  if (!v || v.toLowerCase() === 'нет') return `${copy.permit}: ${copy.noPermit}`
  const applied = /заявка/i.test(v)
  if (/SLF/i.test(v)) return `${copy.slf}: ${applied ? copy.applied : copy.has}`
  if (/PBG|IMB/i.test(v)) return `${copy.permit}: ${applied ? copy.applied : copy.has}`
  return `${copy.permit}: ${facetLabel('permit', v, lang)}`
}

function fmtRange(
  from: number | null, to: number | null,
  currency: 'USD' | 'EUR' | 'RUB' | 'UAH' | 'IDR',
  lang: Lang,
): string | null {
  if (from == null && to == null) return null
  const f = from != null ? formatPrice(from, currency, lang) : null
  const tt = to != null ? formatPrice(to, currency, lang) : null
  const c = pickCopy(COPY, lang)
  if (f && tt && from === to) return f
  if (f && tt) return `${c.from} ${f} ${c.to} ${tt}`
  if (f) return `${c.from} ${f}`
  if (tt) return `${c.to} ${tt}`
  return null
}

export function ComplexCard({ c, lang = 'ru', priority = false }: { c: ComplexCardData; lang?: Lang; priority?: boolean }) {
  const { currency } = useCurrency()
  const copy = pickCopy(COPY, lang)
  const detailHref = switchLangPath(`/ru/zhilye-kompleksy/o/${c.slug}`, lang)
  // Prefer the synced storage photos (multi-image slider). Fallback to the
  // single cover image if the manifest doesn't have entries yet.
  const slides = c.photos.length > 0 ? c.photos : c.coverUrl ? [c.coverUrl] : []
  const villaRange = fmtRange(c.villaPriceFrom, c.villaPriceTo, currency, lang)
  const aptRange   = fmtRange(c.aptPriceFrom,   c.aptPriceTo,   currency, lang)
  // District is usually a Latin place name, but de-Cyrillic it as a safety net
  // so a Russian value never leaks onto a non-RU card.
  const location = c.location && lang !== 'ru' && lang !== 'uk' && hasCyrillic(c.location)
    ? translitPreserveCase(c.location)
    : c.location

  return (
    <Link
      href={detailHref}
      className="group flex h-full flex-col gap-3 text-[#0F1A15] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]"
    >
      <div className="relative overflow-hidden rounded-md">
        <PhotoSlider photos={slides} alt={c.name} heightClass="aspect-[4/3]" trackingId={`complex:${c.slug}`} priority={priority} />
        {c.verifiedYield && <VerifiedYieldBadge lang={lang} onPhoto className="absolute bottom-3 left-3 z-10" />}
        {c.isSold && (
          <div className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full bg-[#DC2626] text-white text-[12px] font-semibold tracking-wide shadow-md">
            {copy.sold}
          </div>
        )}
        <WishlistButton
          className="absolute top-3 right-3 z-10"
          item={{
            kind: 'complex', slug: c.slug, title: c.name,
            photo: c.photos?.[0] ?? c.coverUrl ?? null,
            priceUsd: c.villaPriceFrom ?? c.aptPriceFrom ?? null,
            district: c.location ?? null,
            bedrooms: null,
          }}
        />
      </div>

      {/* «Журнал» (владелец 20.11.2026, макет CatAComplex). */}
      <div className="flex flex-1 flex-col gap-1.5">
        {location && <span className="text-[12px] uppercase tracking-[0.06em] text-[#6B7570]">{location}</span>}
        <h3 className="m-0 truncate text-[20px] font-semibold leading-[1.25] transition-colors duration-[120ms] group-hover:text-[var(--color-primary)]">{c.name}</h3>
        {(villaRange || aptRange) && (
          <div className="flex flex-col gap-0.5 text-[14px] text-[#4A5550]">
            {villaRange && <span>{copy.villas} <span className="font-semibold text-[#0F1A15]">{villaRange}</span></span>}
            {aptRange && <span>{copy.apartments} <span className="font-semibold text-[#0F1A15]">{aptRange}</span></span>}
          </div>
        )}
        <span className="text-[13px] text-[#6B7570]">{permitLine(c.permit, copy, lang)}</span>
        <div className="mt-auto flex flex-col gap-3 pt-1">
          {c.yieldRange && <ComplexYieldPro range={c.yieldRange} lang={lang} />}
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[13px] text-[#6B7570]">{copy.readiness}</span>
            <div className="flex-1"><ProgressBar value={c.readiness} /></div>
          </div>
        </div>
      </div>
    </Link>
  )
}
