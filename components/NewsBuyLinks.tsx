// «Property for sale» links under a news article: villa and apartment
// catalogues for every district the article mentions, or the Bali-wide
// catalogues when it names none. News is the freshest content on the site
// and the sale hubs are what buyers search for (GSC: «villa for sale
// canggu», «купить виллу на бали») — this block routes link weight from
// one to the other. Only districts whose catalogue page is indexable
// (same ≥3-objects rule as the sitemap) are linked, so no link lands on
// a 404 or a thin page.
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { DISTRICT_TO_SLUG, parseCleanPath as parseAptPath } from '@/lib/seo-routes'
import { parseCleanPath as parseVillaPath } from '@/lib/villa-seo-routes'
import { loadAll as loadAllVillas, passes as villaPasses } from '@/app/ru/villy/_lib'
import { loadAll as loadAllApartments, passes as apartmentPasses } from '@/app/ru/apartamenty/_lib'
import { districtRu } from '@/lib/district-ru'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const MIN_OBJECTS = 3
const MAX_DISTRICTS = 3

const COPY = {
  ru: { heading: 'Недвижимость в продаже', bali: 'Бали', villas: (d: string) => `Виллы на продажу: ${d}`, apts: (d: string) => `Апартаменты на продажу: ${d}` },
  en: { heading: 'Property for sale', bali: 'Bali', villas: (d: string) => `Villas for sale in ${d}`, apts: (d: string) => `Apartments for sale in ${d}` },
  id: { heading: 'Properti dijual', bali: 'Bali', villas: (d: string) => `Vila dijual di ${d}`, apts: (d: string) => `Apartemen dijual di ${d}` },
  fr: { heading: 'Biens à vendre', bali: 'Bali', villas: (d: string) => `Villas à vendre à ${d}`, apts: (d: string) => `Appartements à vendre à ${d}` },
  de: { heading: 'Immobilien zum Kauf', bali: 'Bali', villas: (d: string) => `Villen zum Kauf in ${d}`, apts: (d: string) => `Apartments zum Kauf in ${d}` },
  zh: { heading: '在售房产', bali: '巴厘岛', villas: (d: string) => `${d} 在售别墅`, apts: (d: string) => `${d} 在售公寓` },
  nl: { heading: 'Vastgoed te koop', bali: 'Bali', villas: (d: string) => `Villa's te koop in ${d}`, apts: (d: string) => `Appartementen te koop in ${d}` },
  ban: { heading: 'Properti kaadol', bali: 'Bali', villas: (d: string) => `Vila kaadol ring ${d}`, apts: (d: string) => `Apartemen kaadol ring ${d}` },
  pl: { heading: 'Nieruchomości na sprzedaż', bali: 'Bali', villas: (d: string) => `Wille na sprzedaż: ${d}`, apts: (d: string) => `Apartamenty na sprzedaż: ${d}` },
  uk: { heading: 'Нерухомість на продаж', bali: 'Балі', villas: (d: string) => `Вілли на продаж: ${d}`, apts: (d: string) => `Апартаменти на продаж: ${d}` },
} as const

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Districts named in the text, by Latin name or by the Cyrillic stem (RU/UK
// bodies decline names: «в Убуде», «в Унгасане»). Order of first mention.
// Hyphens are folded to spaces on both sides: «Нуса-Дуа» vs «Нуса Дуа».
const fold = (s: string) => s.replace(/[-‐‑]/g, ' ')

function mentionedDistricts(raw: string): string[] {
  const text = fold(raw)
  const hits: { name: string; at: number }[] = []
  for (const name of Object.keys(DISTRICT_TO_SLUG)) {
    const forms = [name, districtRu(name)].filter((f): f is string => !!f && f.length >= 3).map(fold)
    let at = -1
    for (const f of forms) {
      const m = new RegExp(`(^|[^\\p{L}])${escapeRe(f)}`, 'iu').exec(text)
      if (m && (at < 0 || m.index < at)) at = m.index
    }
    if (at >= 0) hits.push({ name, at })
  }
  return hits.sort((a, b) => a.at - b.at).map(h => h.name)
}

export async function NewsBuyLinks({ lang, text }: { lang: Lang; text: string }) {
  const c = pickCopy(COPY, lang)
  const [villas, apts] = await Promise.all([
    loadAllVillas().catch(() => null),
    loadAllApartments().catch(() => null),
  ])
  if (!villas && !apts) return null

  const links: { href: string; label: string }[] = []
  for (const name of mentionedDistricts(text)) {
    if (links.length >= MAX_DISTRICTS * 2) break
    const slug = DISTRICT_TO_SLUG[name]
    const label = lang === 'ru' ? (districtRu(name) ?? name) : name
    const vf = parseVillaPath([slug])
    if (villas && vf && villas.enriched.filter(e => villaPasses(e, vf)).length >= MIN_OBJECTS) {
      links.push({ href: switchLangPath(`/ru/villy/${slug}`, lang), label: c.villas(label) })
    }
    const af = parseAptPath([slug])
    if (apts && af && apts.enriched.filter(e => apartmentPasses(e, af)).length >= MIN_OBJECTS) {
      links.push({ href: switchLangPath(`/ru/apartamenty/${slug}`, lang), label: c.apts(label) })
    }
  }
  if (links.length === 0) {
    links.push(
      { href: switchLangPath('/ru/villy', lang), label: c.villas(c.bali) },
      { href: switchLangPath('/ru/apartamenty', lang), label: c.apts(c.bali) },
    )
  }

  return (
    <section className="mt-14">
      <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
        {c.heading}
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
        {links.map(l => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center justify-between gap-3 h-full bg-white rounded-2xl border border-[var(--color-border)] px-5 py-4 text-[15px] font-medium text-[var(--color-text)] no-underline hover:border-[var(--color-primary)] focus-visible:border-[var(--color-primary)] transition-colors"
            >
              <span>{l.label}</span>
              <ChevronRight size={16} className="shrink-0 text-[var(--color-primary-pressed)]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
