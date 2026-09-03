import { pluralRu } from '@/lib/plural-ru'
import type { Lang } from '@/lib/i18n'
import type { DeveloperStats } from '@/lib/developer-stats'

// Commercial <title>/<description> for complex and developer pages.
//
// Why: GSC (08.07–04.08) shows 416 of these pages pulling 7281 impressions at
// average position ~7–9 for only 105 clicks — a 1.44% CTR where 3% is normal
// at those positions. The rankings are already there; the snippet is what
// fails. Two different failures:
//
//   • complexes ranked fine but the title spent its 60 visible characters on
//     unit types («Surfside Bali — Apartments, Villas & Penthouses in
//     Uluwatu, Bali») and never showed a price;
//   • developer pages («breig»: 434 impressions, 0 clicks) had a template
//     title with no numbers and a description that was the first 160
//     characters of a generic marketing blurb.
//
// Both are replaced with the facts a brand-query searcher actually wants:
// price, size, readiness, track record.

/** What Google renders before truncating — measured on the part before the brand. */
const TITLE_BUDGET = 60
const BRAND = ' | Balinsky'

const USD = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

/** en/de/nl/fr-style two-form plural. */
const two = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** Polish: 1 / 2–4 / 5+, same shape as the Russian rule. */
function pluralPl(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (n === 1) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

type Terms = {
  /** List separator — Chinese wants the full-width form, not an ASCII comma. */
  sep?: string
  from: string
  ready: (y: string) => string
  beds: (min: number, max: number) => string
  /** «18 проектов на Бали» */
  projects: (n: number) => string
  /** «14 сдано» */
  delivered: (n: number) => string
  /** «4 строится» — used instead of «0 сдано», which reads as a warning. */
  building: (n: number) => string
  /** «589 юнитов» */
  units: (n: number) => string
  devDesc: (a: { name: string; total: number; ready: number; inProgress: number; units: number }) => string
  /** Заголовок застройщика, у которого в базе нет ни одного проекта. */
  devTitleBare: (name: string) => string
  /** Описание для того же случая — обещает только то, что на странице есть. */
  devDescBare: (name: string) => string
}

const TERMS: Record<Lang, Terms> = {
  ru: {
    from: 'от',
    ready: y => `сдача ${y}`,
    beds: (a, b) => (a === b ? `${a} спальни` : `${a}–${b} спальни`),
    projects: n => `${n} ${pluralRu(n, ['проект', 'проекта', 'проектов'])} на Бали`,
    delivered: n => `${n} сдано`,
    building: n => `${n} строится`,
    units: n => `${n} ${pluralRu(n, ['юнит', 'юнита', 'юнитов'])}`,
    devDesc: a => `Независимая проверка ${a.name}: разрешения PBG/SLF, реальные сроки сдачи, цены и отзывы. ${a.total} ${pluralRu(a.total, ['проект', 'проекта', 'проектов'])} на Бали — ${a.ready} сдано, ${a.inProgress} строится.`,
    devTitleBare: n => `${n} — застройщик на Бали: отзывы и проверка`,
    devDescBare: n => `${n} на Бали — независимый разбор: как проверить репутацию и разрешения PBG/SLF, условия работы и комиссия, отзывы. Без рекламы застройщика.`,
  },
  en: {
    from: 'from',
    ready: y => `ready ${y}`,
    beds: (a, b) => (a === b ? `${a} BR` : `${a}–${b} BR`),
    projects: n => `${n} Bali ${two(n, 'project', 'projects')}`,
    delivered: n => `${n} delivered`,
    building: n => `${n} under construction`,
    units: n => `${n} ${two(n, 'unit', 'units')}`,
    devDesc: a => `Independent check on ${a.name}: PBG/SLF permits, real handover dates, prices and reviews. ${a.total} Bali ${two(a.total, 'project', 'projects')} — ${a.ready} delivered, ${a.inProgress} under construction.`,
    devTitleBare: n => `${n} — Bali developer: reviews and independent check`,
    devDescBare: n => `${n} in Bali — an independent read: how to verify the track record and PBG/SLF permits, terms and commission, reviews. Not the developer's own pitch.`,
  },
  id: {
    from: 'dari',
    ready: y => `serah terima ${y}`,
    beds: (a, b) => (a === b ? `${a} kamar` : `${a}–${b} kamar`),
    projects: n => `${n} proyek di Bali`,
    delivered: n => `${n} selesai`,
    building: n => `${n} dalam pembangunan`,
    units: n => `${n} unit`,
    devDesc: a => `Cek independen ${a.name}: izin PBG/SLF, tanggal serah terima nyata, harga dan ulasan. ${a.total} proyek di Bali — ${a.ready} selesai, ${a.inProgress} dalam pembangunan.`,
    devTitleBare: n => `${n} — pengembang Bali: ulasan dan cek independen`,
    devDescBare: n => `${n} di Bali — ulasan independen: cara memeriksa rekam jejak dan izin PBG/SLF, syarat kerja sama dan komisi, ulasan. Bukan promosi pengembang.`,
  },
  fr: {
    from: 'à partir de',
    ready: y => `livraison ${y}`,
    beds: (a, b) => (a === b ? `${a} chambre` : `${a}–${b} chambres`),
    projects: n => `${n} ${two(n, 'projet', 'projets')} à Bali`,
    delivered: n => `${n} ${two(n, 'livré', 'livrés')}`,
    building: n => `${n} en construction`,
    units: n => `${n} ${two(n, 'lot', 'lots')}`,
    devDesc: a => `Vérification indépendante de ${a.name} : permis PBG/SLF, dates de livraison réelles, prix et avis. ${a.total} ${two(a.total, 'projet', 'projets')} à Bali — ${a.ready} ${two(a.ready, 'livré', 'livrés')}, ${a.inProgress} en construction.`,
    devTitleBare: n => `${n} — promoteur à Bali : avis et vérification`,
    devDescBare: n => `${n} à Bali — analyse indépendante : comment vérifier la réputation et les permis PBG/SLF, conditions et commission, avis. Pas la communication du promoteur.`,
  },
  de: {
    from: 'ab',
    ready: y => `fertig ${y}`,
    beds: (a, b) => (a === b ? `${a} Zi.` : `${a}–${b} Zi.`),
    projects: n => `${n} Bali-${two(n, 'Projekt', 'Projekte')}`,
    delivered: n => `${n} fertiggestellt`,
    building: n => `${n} im Bau`,
    units: n => `${n} ${two(n, 'Einheit', 'Einheiten')}`,
    devDesc: a => `Unabhängige Prüfung von ${a.name}: PBG/SLF-Genehmigungen, echte Übergabetermine, Preise und Bewertungen. ${a.total} ${two(a.total, 'Projekt', 'Projekte')} auf Bali — ${a.ready} fertig, ${a.inProgress} im Bau.`,
    devTitleBare: n => `${n} — Bali-Bauträger: Bewertungen und Prüfung`,
    devDescBare: n => `${n} auf Bali — unabhängige Einschätzung: Reputation und PBG/SLF-Genehmigungen prüfen, Konditionen und Provision, Bewertungen. Keine Werbung des Bauträgers.`,
  },
  zh: {
    sep: '，',
    from: '起价',
    ready: y => `${y}年交付`,
    beds: (a, b) => (a === b ? `${a}居室` : `${a}–${b}居室`),
    projects: n => `巴厘岛${n}个项目`,
    delivered: n => `已交付${n}个`,
    building: n => `在建${n}个`,
    units: n => `${n}套`,
    devDesc: a => `${a.name} 独立核查：PBG/SLF 许可、真实交付日期、价格与评价。巴厘岛${a.total}个项目，已交付${a.ready}个，在建${a.inProgress}个。`,
    devTitleBare: n => `${n} — 巴厘岛开发商：评价与独立核查`,
    devDescBare: n => `${n} 巴厘岛开发商独立解读：如何核实业绩与 PBG/SLF 许可、合作条件与佣金、真实评价。非开发商官方宣传。`,
  },
  nl: {
    from: 'vanaf',
    ready: y => `oplevering ${y}`,
    beds: (a, b) => (a === b ? `${a} slaapk.` : `${a}–${b} slaapk.`),
    projects: n => `${n} Bali-${two(n, 'project', 'projecten')}`,
    delivered: n => `${n} opgeleverd`,
    building: n => `${n} in aanbouw`,
    units: n => `${n} units`,
    devDesc: a => `Onafhankelijke check van ${a.name}: PBG/SLF-vergunningen, echte opleverdata, prijzen en reviews. ${a.total} ${two(a.total, 'project', 'projecten')} op Bali — ${a.ready} opgeleverd, ${a.inProgress} in aanbouw.`,
    devTitleBare: n => `${n} — Bali-ontwikkelaar: reviews en check`,
    devDescBare: n => `${n} op Bali — onafhankelijk beeld: reputatie en PBG/SLF-vergunningen controleren, voorwaarden en commissie, reviews. Geen verhaal van de ontwikkelaar zelf.`,
  },
  ban: {
    from: 'saking',
    ready: y => `puput ${y}`,
    beds: (a, b) => (a === b ? `${a} kamar` : `${a}–${b} kamar`),
    projects: n => `${n} proyek ring Bali`,
    delivered: n => `${n} puput`,
    building: n => `${n} kantun kawangun`,
    units: n => `${n} unit`,
    devDesc: a => `Cek independen ${a.name}: izin PBG/SLF, tanggal puput sujati, aji miwah ulasan. ${a.total} proyek ring Bali — ${a.ready} puput, ${a.inProgress} kantun kawangun.`,
    devTitleBare: n => `${n} — pangwangun Bali: ulasan miwah cek independen`,
    devDescBare: n => `${n} ring Bali — tinjauan independen: sapunapi ngecek rekam jejak miwah izin PBG/SLF, syarat miwah komisi, ulasan. Boya promosi pangwangun.`,
  },
  pl: {
    from: 'od',
    ready: y => `oddanie ${y}`,
    beds: (a, b) => (a === b ? `${a} sypialnia` : `${a}–${b} sypialnie`),
    projects: n => `${n} ${pluralPl(n, ['inwestycja', 'inwestycje', 'inwestycji'])} na Bali`,
    delivered: n => `${n} ${pluralPl(n, ['oddana', 'oddane', 'oddanych'])}`,
    building: n => `${n} w budowie`,
    units: n => `${n} ${pluralPl(n, ['lokal', 'lokale', 'lokali'])}`,
    devDesc: a => `Niezależna weryfikacja ${a.name}: pozwolenia PBG/SLF, realne terminy oddania, ceny i opinie. ${a.total} ${pluralPl(a.total, ['inwestycja', 'inwestycje', 'inwestycji'])} na Bali — ${a.ready} ${pluralPl(a.ready, ['oddana', 'oddane', 'oddanych'])}, ${a.inProgress} w budowie.`,
    devTitleBare: n => `${n} — deweloper na Bali: opinie i weryfikacja`,
    devDescBare: n => `${n} na Bali — niezależna analiza: jak sprawdzić historię i pozwolenia PBG/SLF, warunki współpracy i prowizja, opinie. To nie materiał dewelopera.`,
  },
  uk: {
    from: 'від',
    ready: y => `здача ${y}`,
    beds: (a, b) => (a === b ? `${a} спальня` : `${a}–${b} спальні`),
    projects: n => `${n} ${pluralRu(n, ['проєкт', 'проєкти', 'проєктів'])} на Балі`,
    delivered: n => `${n} здано`,
    building: n => `${n} будується`,
    units: n => `${n} ${pluralRu(n, ['юніт', 'юніти', 'юнітів'])}`,
    devDesc: a => `Незалежна перевірка ${a.name}: дозволи PBG/SLF, реальні терміни здачі, ціни та відгуки. ${a.total} ${pluralRu(a.total, ['проєкт', 'проєкти', 'проєктів'])} на Балі — ${a.ready} здано, ${a.inProgress} будується.`,
    devTitleBare: n => `${n} — забудовник на Балі: відгуки та перевірка`,
    devDescBare: n => `${n} на Балі — незалежний розбір: як перевірити репутацію та дозволи PBG/SLF, умови роботи й комісія, відгуки. Не реклама забудовника.`,
  },
}

const t = (lang: Lang): Terms => TERMS[lang] ?? TERMS.en

/**
 * Longest candidate that still fits the visible budget. Candidates are ordered
 * richest-first; the last one is the floor and ships even if it overflows.
 */
function fit(candidates: string[]): string {
  return candidates.find(s => s.length <= TITLE_BUDGET) ?? candidates[candidates.length - 1]
}

/**
 * «Surfside Bali, Uluwatu — 1–4 BR from $167,000, ready 2026 | Balinsky».
 *
 * Front-loads the two facts a brand-query searcher is actually after — price
 * and readiness — inside the characters Google shows. Returns null when there
 * is no price to lead with, so the caller keeps its existing title rather than
 * shipping a worse one.
 */
export function commercialComplexTitle(args: {
  name: string
  district: string | null
  priceFromUsd: number | null
  bedsMin: number | null
  bedsMax: number | null
  year: string | null
  lang: Lang
}): string | null {
  const { name, district, priceFromUsd, bedsMin, bedsMax, year, lang } = args
  if (!priceFromUsd || !Number.isFinite(priceFromUsd)) return null
  const c = t(lang)

  const head = district ? `${name}, ${district}` : name
  const price = `${c.from} ${USD(priceFromUsd)}`
  const beds = bedsMin != null && bedsMax != null && bedsMin > 0 ? c.beds(bedsMin, bedsMax) : null
  const ready = year && /^\d{4}$/.test(year) ? c.ready(year) : null

  // Price is non-negotiable; bedrooms and readiness drop out as room runs out.
  const sep = c.sep ?? ', '
  const full = [beds, price].filter(Boolean).join(' ')
  return fit([
    ready ? `${head} — ${full}${sep}${ready}` : `${head} — ${full}`,
    `${head} — ${full}`,
    `${head} — ${price}`,
    `${name} — ${price}`,
  ]) + BRAND
}

/**
 * Snippet for a developer with NO projects on file — 44 of 91 published
 * developer pages, as of 03.09.2026. They used to fall back to a template
 * title («X — Bali property developer | projects, score, reviews») plus the
 * first 160 characters of a marketing blurb, cut mid-word: GSC shows «mits»
 * at position 8.4 on 75 impressions and «greywoods» at 8.5 on 30, both with
 * zero clicks. There is no track record to lead with, so the snippet promises
 * the one thing the developer's own site never will — an outside check — and
 * nothing that isn't on the page.
 */
export function bareDeveloperMeta(args: { name: string; lang: Lang }): { title: string; description: string } {
  const c = t(args.lang)
  return {
    title: c.devTitleBare(args.name) + BRAND,
    description: c.devDescBare(args.name),
  }
}

/**
 * Developer title + description built from the real track record instead of a
 * template. Returns null when the developer has no projects on file — the
 * caller falls back to `bareDeveloperMeta` rather than claiming «0 projects».
 */
export function commercialDeveloperMeta(args: {
  name: string
  stats: DeveloperStats | null
  lang: Lang
}): { title: string; description: string } | null {
  const { name, stats, lang } = args
  if (!stats || stats.total <= 0) return null
  const c = t(lang)

  // «0 delivered» reads as a warning in a snippet, so a builder with nothing
  // handed over yet leads with what it does have under way.
  const track = stats.ready > 0 ? c.delivered(stats.ready) : c.building(stats.inProgress)
  const projects = c.projects(stats.total)
  const units = stats.unitsTotal > 0 ? c.units(stats.unitsTotal) : null

  const sep = c.sep ?? ', '
  const title = fit([
    units ? `${name} — ${projects}${sep}${track} · ${units}` : `${name} — ${projects}${sep}${track}`,
    `${name} — ${projects}${sep}${track}`,
    `${name} — ${projects}`,
  ]) + BRAND

  return {
    title,
    description: c.devDesc({
      name,
      total: stats.total,
      ready: stats.ready,
      inProgress: stats.inProgress,
      units: stats.unitsTotal,
    }),
  }
}
