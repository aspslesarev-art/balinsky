import type { Lang } from '@/lib/i18n'
import type { HubLongCopy } from './types'

import villasRu from './villas/ru'
import villasEn from './villas/en'
import villasId from './villas/id'
import villasFr from './villas/fr'
import villasDe from './villas/de'
import villasZh from './villas/zh'
import villasNl from './villas/nl'
import villasBan from './villas/ban'
import villasPl from './villas/pl'
import villasUk from './villas/uk'

import aptRu from './apartments/ru'
import aptEn from './apartments/en'
import aptId from './apartments/id'
import aptFr from './apartments/fr'
import aptDe from './apartments/de'
import aptZh from './apartments/zh'
import aptNl from './apartments/nl'
import aptBan from './apartments/ban'
import aptPl from './apartments/pl'
import aptUk from './apartments/uk'

export type { HubLongCopy, HubSection, HubPriceTable, HubFaqItem } from './types'

export type HubKind = 'villas' | 'apartments'

const COPY: Record<HubKind, Record<Lang, HubLongCopy>> = {
  villas: {
    ru: villasRu, en: villasEn, id: villasId, fr: villasFr, de: villasDe,
    zh: villasZh, nl: villasNl, ban: villasBan, pl: villasPl, uk: villasUk,
  },
  apartments: {
    ru: aptRu, en: aptEn, id: aptId, fr: aptFr, de: aptDe,
    zh: aptZh, nl: aptNl, ban: aptBan, pl: aptPl, uk: aptUk,
  },
}

export function getHubLongCopy(kind: HubKind, lang: Lang): HubLongCopy {
  return COPY[kind][lang] ?? COPY[kind].en
}

/**
 * True only for the bare catalog hub — no district, bedrooms, price, query or
 * any other filter applied. The long-form copy is gated on this so the ~2300
 * filtered catalog pages don't all carry the same 900 words.
 *
 * Written against the shape rather than a field list so a newly added filter is
 * covered automatically: both VillaFilterState and FilterState use '' / null /
 * [] for "not set" (see EMPTY_FILTERS in the two _lib.ts files).
 */
export function isUnfilteredHub(filters: object): boolean {
  return Object.values(filters).every(v => {
    if (v == null) return true
    if (Array.isArray(v)) return v.length === 0
    if (typeof v === 'string') return v.trim() === ''
    return false
  })
}
