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
    devDesc: a => `Независимый разбор застройщика ${a.name}: ${a.total} ${pluralRu(a.total, ['проект', 'проекта', 'проектов'])} на Бали — ${a.ready} сдано, ${a.inProgress} строится${a.units ? `, ${a.units} ${pluralRu(a.units, ['юнит', 'юнита', 'юнитов'])}` : ''}. Оценка по стройке, репутации, оснащению и управлению, текущие объекты и цены.`,
  },
  en: {
    from: 'from',
    ready: y => `ready ${y}`,
    beds: (a, b) => (a === b ? `${a} BR` : `${a}–${b} BR`),
    projects: n => `${n} Bali ${two(n, 'project', 'projects')}`,
    delivered: n => `${n} delivered`,
    building: n => `${n} under construction`,
    units: n => `${n} ${two(n, 'unit', 'units')}`,
    devDesc: a => `Independent profile of ${a.name}: ${a.total} ${two(a.total, 'project', 'projects')} in Bali — ${a.ready} delivered, ${a.inProgress} under construction${a.units ? `, ${a.units} ${two(a.units, 'unit', 'units')}` : ''}. Scored on construction, reputation, fit-out and management, with current listings and prices.`,
  },
  id: {
    from: 'dari',
    ready: y => `serah terima ${y}`,
    beds: (a, b) => (a === b ? `${a} kamar` : `${a}–${b} kamar`),
    projects: n => `${n} proyek di Bali`,
    delivered: n => `${n} selesai`,
    building: n => `${n} dalam pembangunan`,
    units: n => `${n} unit`,
    devDesc: a => `Profil independen ${a.name}: ${a.total} proyek di Bali — ${a.ready} selesai, ${a.inProgress} dalam pembangunan${a.units ? `, ${a.units} unit` : ''}. Dinilai dari konstruksi, reputasi, kelengkapan, dan manajemen, plus unit dan harga terkini.`,
  },
  fr: {
    from: 'à partir de',
    ready: y => `livraison ${y}`,
    beds: (a, b) => (a === b ? `${a} chambre` : `${a}–${b} chambres`),
    projects: n => `${n} ${two(n, 'projet', 'projets')} à Bali`,
    delivered: n => `${n} ${two(n, 'livré', 'livrés')}`,
    building: n => `${n} en construction`,
    units: n => `${n} ${two(n, 'lot', 'lots')}`,
    devDesc: a => `Profil indépendant de ${a.name} : ${a.total} ${two(a.total, 'projet', 'projets')} à Bali — ${a.ready} ${two(a.ready, 'livré', 'livrés')}, ${a.inProgress} en construction${a.units ? `, ${a.units} ${two(a.units, 'lot', 'lots')}` : ''}. Note sur la construction, la réputation, les équipements et la gestion, avec les biens et prix actuels.`,
  },
  de: {
    from: 'ab',
    ready: y => `fertig ${y}`,
    beds: (a, b) => (a === b ? `${a} Zi.` : `${a}–${b} Zi.`),
    projects: n => `${n} Bali-${two(n, 'Projekt', 'Projekte')}`,
    delivered: n => `${n} fertiggestellt`,
    building: n => `${n} im Bau`,
    units: n => `${n} ${two(n, 'Einheit', 'Einheiten')}`,
    devDesc: a => `Unabhängiges Profil von ${a.name}: ${a.total} ${two(a.total, 'Projekt', 'Projekte')} auf Bali — ${a.ready} fertiggestellt, ${a.inProgress} im Bau${a.units ? `, ${a.units} ${two(a.units, 'Einheit', 'Einheiten')}` : ''}. Bewertet nach Bauqualität, Reputation, Ausstattung und Verwaltung, mit aktuellen Objekten und Preisen.`,
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
    devDesc: a => `${a.name} 独立评估：巴厘岛${a.total}个项目，已交付${a.ready}个，在建${a.inProgress}个${a.units ? `，共${a.units}套` : ''}。从施工、口碑、配置与管理四个维度评分，并提供在售房源与价格。`,
  },
  nl: {
    from: 'vanaf',
    ready: y => `oplevering ${y}`,
    beds: (a, b) => (a === b ? `${a} slaapk.` : `${a}–${b} slaapk.`),
    projects: n => `${n} Bali-${two(n, 'project', 'projecten')}`,
    delivered: n => `${n} opgeleverd`,
    building: n => `${n} in aanbouw`,
    units: n => `${n} units`,
    devDesc: a => `Onafhankelijk profiel van ${a.name}: ${a.total} ${two(a.total, 'project', 'projecten')} op Bali — ${a.ready} opgeleverd, ${a.inProgress} in aanbouw${a.units ? `, ${a.units} units` : ''}. Beoordeeld op bouw, reputatie, afwerking en beheer, met actueel aanbod en prijzen.`,
  },
  ban: {
    from: 'saking',
    ready: y => `puput ${y}`,
    beds: (a, b) => (a === b ? `${a} kamar` : `${a}–${b} kamar`),
    projects: n => `${n} proyek ring Bali`,
    delivered: n => `${n} puput`,
    building: n => `${n} kantun kawangun`,
    units: n => `${n} unit`,
    devDesc: a => `Tinjauan independen ${a.name}: ${a.total} proyek ring Bali — ${a.ready} puput, ${a.inProgress} kantun kawangun${a.units ? `, ${a.units} unit` : ''}. Kaicen manut wangunan, reputasi, kelengkapan, lan manajemen, sareng unit lan aji sane wenten.`,
  },
  pl: {
    from: 'od',
    ready: y => `oddanie ${y}`,
    beds: (a, b) => (a === b ? `${a} sypialnia` : `${a}–${b} sypialnie`),
    projects: n => `${n} ${pluralPl(n, ['inwestycja', 'inwestycje', 'inwestycji'])} na Bali`,
    delivered: n => `${n} ${pluralPl(n, ['oddana', 'oddane', 'oddanych'])}`,
    building: n => `${n} w budowie`,
    units: n => `${n} ${pluralPl(n, ['lokal', 'lokale', 'lokali'])}`,
    devDesc: a => `Niezależny profil ${a.name}: ${a.total} ${pluralPl(a.total, ['inwestycja', 'inwestycje', 'inwestycji'])} na Bali — ${a.ready} ${pluralPl(a.ready, ['oddana', 'oddane', 'oddanych'])}, ${a.inProgress} w budowie${a.units ? `, ${a.units} ${pluralPl(a.units, ['lokal', 'lokale', 'lokali'])}` : ''}. Ocena budowy, reputacji, wyposażenia i zarządzania, wraz z aktualną ofertą i cenami.`,
  },
  uk: {
    from: 'від',
    ready: y => `здача ${y}`,
    beds: (a, b) => (a === b ? `${a} спальня` : `${a}–${b} спальні`),
    projects: n => `${n} ${pluralRu(n, ['проєкт', 'проєкти', 'проєктів'])} на Балі`,
    delivered: n => `${n} здано`,
    building: n => `${n} будується`,
    units: n => `${n} ${pluralRu(n, ['юніт', 'юніти', 'юнітів'])}`,
    devDesc: a => `Незалежний розбір забудовника ${a.name}: ${a.total} ${pluralRu(a.total, ['проєкт', 'проєкти', 'проєктів'])} на Балі — ${a.ready} здано, ${a.inProgress} будується${a.units ? `, ${a.units} ${pluralRu(a.units, ['юніт', 'юніти', 'юнітів'])}` : ''}. Оцінка за будівництвом, репутацією, оснащенням і управлінням, актуальні об'єкти та ціни.`,
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
 * Developer title + description built from the real track record instead of a
 * template. Returns null when the developer has no projects on file — those
 * pages keep the generic copy rather than claiming «0 projects».
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
