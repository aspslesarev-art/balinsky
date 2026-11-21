// «Купить виллу в <район>» — три виллы района + ссылка на хаб района
// (макет B, владелец 21.11.2026). Стоит под новостями и объявлениями аренды:
// туда приходят из Google, а продажа — то, ради чего сайт. Ссылки передают
// вес страницам «купить виллу в …», которые мы двигаем в поиске.
// Район берём из текста новости / района объявления. Нет района или в нём
// меньше 3 вилл — самые доходные виллы Бали и ссылка на весь каталог.
import Link from 'next/link'
import { VillaCard } from '@/components/VillaCard'
import { mentionedDistricts } from '@/components/NewsBuyLinks'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { parseCleanPath as parseVillaPath } from '@/lib/villa-seo-routes'
import { loadCatalogPage, EMPTY_FILTERS } from '@/app/ru/villy/_lib'
import { getBuyAnchor, getDistrictCopy } from '@/lib/districts'
import { CATALOG_EYEBROW } from '@/lib/catalog-eyebrow'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const MIN_OBJECTS = 3

const ALL = {
  ru: (d: string) => `Все виллы ${d} →`, en: (d: string) => `All villas ${d} →`,
  id: (d: string) => `Semua vila ${d} →`, fr: (d: string) => `Toutes les villas ${d} →`,
  de: (d: string) => `Alle Villen ${d} →`, zh: (d: string) => `${d}全部别墅 →`,
  nl: (d: string) => `Alle villa's ${d} →`, ban: (d: string) => `Sami vila ${d} →`,
  pl: (d: string) => `Wszystkie wille ${d} →`, uk: (d: string) => `Усі вілли ${d} →`,
} as const

const WHERE = {
  ru: { bali: 'на Бали', in: (a: string) => `в ${a}` }, en: { bali: 'in Bali', in: (a: string) => `in ${a}` },
  id: { bali: 'di Bali', in: (a: string) => `di ${a}` }, fr: { bali: 'à Bali', in: (a: string) => `à ${a}` },
  de: { bali: 'auf Bali', in: (a: string) => `in ${a}` }, zh: { bali: '巴厘岛', in: (a: string) => a },
  nl: { bali: 'op Bali', in: (a: string) => `in ${a}` }, ban: { bali: 'ring Bali', in: (a: string) => `ring ${a}` },
  pl: { bali: 'na Bali', in: (a: string) => `w ${a}` }, uk: { bali: 'на Балі', in: (a: string) => `у ${a}` },
} as const

export async function BuyVillasNearby({ lang, text }: { lang: Lang; text: string | null | undefined }) {
  let page = null as Awaited<ReturnType<typeof loadCatalogPage>> | null
  let slug: string | null = null
  for (const name of text ? mentionedDistricts(text) : []) {
    const s = DISTRICT_TO_SLUG[name]
    const f = s ? parseVillaPath([s]) : null
    if (!f) continue
    const p = await loadCatalogPage(f, 1, lang).catch(() => null)
    if (p && p.totalCount >= MIN_OBJECTS) { page = p; slug = s; break }
  }
  if (!page) page = await loadCatalogPage(EMPTY_FILTERS, 1, lang).catch(() => null)
  if (!page || page.cards.length === 0) return null

  // Разные проекты: иначе три юнита одного комплекса выглядят как дубль.
  // Проект = название без площади/спален; запасной ключ — застройщик.
  const seen = new Set<string>()
  const picks = page.cards.filter(c => {
    const key = (c.title.replace(/[\d.,]+\s*(m²|м²|m2).*$/i, '').trim() || c.developerName || c.id).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 3)
  if (picks.length < 3) for (const c of page.cards) { if (picks.length >= 3) break; if (!picks.includes(c)) picks.push(c) }

  const name = slug ? (getDistrictCopy(slug, lang)?.name ?? slug) : null
  const w = pickCopy(WHERE, lang)
  const href = switchLangPath(slug ? `/ru/villy/${slug}` : '/ru/villy', lang)

  return (
    <section className="mt-14">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{CATALOG_EYEBROW[lang] ?? CATALOG_EYEBROW.en}</p>
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)]">
            {getBuyAnchor('villa', lang, name ?? undefined)}
          </h2>
        </div>
        <Link href={href} className="text-[15px] font-semibold text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] rounded">
          {pickCopy(ALL, lang)(name ? w.in(name) : w.bali)}
        </Link>
      </div>
      {/* Телефон: листаются вбок, чтобы три карточки не растягивали страницу. */}
      <div className="-mx-6 flex max-w-none snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {picks.map(c => (
          <div key={c.id} className="w-[80%] shrink-0 snap-start sm:w-auto">
            <VillaCard a={c} lang={lang} />
          </div>
        ))}
      </div>
    </section>
  )
}
