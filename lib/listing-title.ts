import { pluralRu } from '@/lib/plural-ru'
import type { Lang } from '@/lib/i18n'

// Listing titles come pre-composed in `SEO:Title` («Вилла NAME в DISTRICT -
// 140 м², 2 спальни»). When a slot behind that formula is empty the string
// still renders, just broken: «Вилла  в  -  м²,  спальни». 40 villas and 77
// apartments in the catalog are in that state today.
//
// So no consumer may trust `SEO:Title` blindly: walk the candidates, skip the
// malformed ones, and compose from structured fields as a last resort.
// Apartments had this guard locally; villas did not, which is why the broken
// cards were visible on the villa hub.

export type ListingKind = 'villa' | 'apartment'

/** Drop the « | Balinsky» suffix the Airtable formula appended. */
export function stripBrand(s: string | null | undefined): string | null {
  if (typeof s !== 'string') return null
  return s.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() || null
}

/**
 * A title with an empty slot: doubled space, a dangling «в -» / "in -",
 * a stray «— -», an empty measurement («-  м²»), or a trailing preposition.
 */
export function isMalformedTitle(s: string | null | undefined): boolean {
  if (!s) return false
  return /(?:\s{2}|\bв\s+[-—]|\bin\s+[-—]|—\s*-|\bв\s*$|[-—]\s+м²)/i.test(s)
}

const TITLE_TERMS: Record<Exclude<Lang, 'ru'>, {
  noun: Record<ListingKind, string>
  inDistrict: (d: string) => string
  bedroomWord: string
}> = {
  en:  { noun: { villa: 'Villa', apartment: 'Apartment' },   inDistrict: d => `in ${d}`,   bedroomWord: 'BR' },
  id:  { noun: { villa: 'Vila', apartment: 'Apartemen' },    inDistrict: d => `di ${d}`,   bedroomWord: 'kamar tidur' },
  fr:  { noun: { villa: 'Villa', apartment: 'Appartement' }, inDistrict: d => `à ${d}`,    bedroomWord: 'chambres' },
  de:  { noun: { villa: 'Villa', apartment: 'Apartment' },   inDistrict: d => `in ${d}`,   bedroomWord: 'Schlafzimmer' },
  zh:  { noun: { villa: '别墅', apartment: '公寓' },           inDistrict: d => d,           bedroomWord: '卧室' },
  nl:  { noun: { villa: 'Villa', apartment: 'Appartement' }, inDistrict: d => `in ${d}`,   bedroomWord: 'slaapkamers' },
  ban: { noun: { villa: 'Vila', apartment: 'Apartemen' },    inDistrict: d => `ring ${d}`, bedroomWord: 'kamar pules' },
  pl:  { noun: { villa: 'Willa', apartment: 'Apartament' },  inDistrict: d => `w ${d}`,    bedroomWord: 'sypialnie' },
  uk:  { noun: { villa: 'Вілла', apartment: 'Апартаменти' }, inDistrict: d => `в ${d}`,    bedroomWord: 'спальні' },
}

const RU_NOUN: Record<ListingKind, string> = { villa: 'Вилла', apartment: 'Апартаменты' }

export function fallbackListingTitle(args: {
  kind: ListingKind
  district: string | null
  area: number | null
  bedrooms: string | null
  lang: Lang
}): string {
  const { kind, district, area, bedrooms, lang } = args
  const head: string[] = []
  const tail: string[] = []

  if (lang === 'ru') {
    head.push(RU_NOUN[kind])
    if (district) head.push(`в ${district}`)
    if (area != null) tail.push(`${area} м²`)
    if (bedrooms) {
      const n = Number(bedrooms)
      const word = Number.isFinite(n) ? pluralRu(n, ['спальня', 'спальни', 'спален']) : 'спален'
      tail.push(`${bedrooms} ${word}`)
    }
  } else {
    const t = TITLE_TERMS[lang]
    head.push(t.noun[kind])
    if (district) head.push(t.inDistrict(district))
    if (area != null) tail.push(`${area} m²`)
    if (bedrooms) tail.push(`${bedrooms} ${t.bedroomWord}`)
  }

  return [head.join(' '), tail.join(', ')].filter(Boolean).join(' — ')
}

/**
 * The one entry point every card / detail page / OG image should use: first
 * usable authored title, otherwise a title composed from what the row does
 * have. Never returns a string with an empty slot in it.
 */
export function resolveListingTitle(args: {
  kind: ListingKind
  candidates: (string | null | undefined)[]
  district: string | null
  area: number | null
  bedrooms: string | null
  lang: Lang
}): string {
  for (const candidate of args.candidates) {
    const s = stripBrand(candidate)
    if (s && !isMalformedTitle(s)) return s
  }
  return fallbackListingTitle(args)
}
