import { enKnowledgeSlug } from '@/lib/knowledge-en-slugs'
import type { Lang } from '@/lib/i18n'

// Contextual hub → knowledge links.
//
// The 70 knowledge articles pull real impressions but sat in their own silo:
// nothing on the catalog hubs pointed at them, and their authority never
// flowed back to the pages that have to rank for «купить виллу на Бали».
// These links close that loop.
//
// The knowledge section only exists on /ru and /en (app/ru/znaniya,
// app/en/knowledge), so every other locale gets nothing rather than a 404.

export type ReadingKind = 'villas' | 'apartments'

export type ReadingLink = {
  href: string
  label: string
}

type Article = {
  /** RU slug — the key the EN slug map is built on. */
  slug: string
  ru: string
  en: string
}

const HEADING: Record<'ru' | 'en', string> = {
  ru: 'Полезное по теме',
  en: 'Worth reading next',
}

const ARTICLES: Record<ReadingKind, Article[]> = {
  villas: [
    {
      slug: 'skolko-stoit-villa-na-bali-tseny-po-rayonam-v-2026-godu',
      ru: 'Сколько стоит вилла на Бали: цены по районам',
      en: 'How much a Bali villa costs: prices by area',
    },
    {
      slug: 'leasehold-ili-freehold-na-bali-chto-dostupno-inostrantsu-v-2026',
      ru: 'Leasehold или freehold: что доступно иностранцу',
      en: 'Leasehold or freehold: what a foreigner can hold',
    },
    {
      slug: 'mozhno-li-rossiyaninu-kupit-nedvizhimost-na-bali-i-kak-eto-sdelat-zakonno-v-2026',
      ru: 'Можно ли россиянину купить недвижимость на Бали',
      en: 'Can foreigners buy property in Bali, and how',
    },
    {
      slug: 'nalogi-na-nedvizhimost-na-bali-pokupka-vladenie-arenda-prodazha-2026',
      ru: 'Налоги: покупка, владение, аренда, продажа',
      en: 'Taxes: buying, owning, renting out, selling',
    },
    {
      slug: 'zony-zemli-na-bali-tsveta-kody-rdtr-chto-nuzhno-znat-investoru',
      ru: 'Зоны земли: цвета, коды и RDTR',
      en: 'Land zones: colours, codes and RDTR',
    },
  ],
  apartments: [
    {
      slug: 'dohodnost-arendy-na-bali-chto-realno-pokazyvayut-dannye-2026',
      ru: 'Доходность аренды: что показывают данные',
      en: 'Rental yield: what the data actually shows',
    },
    {
      slug: 'changu-dlya-investora-oversupplay-1621-apartament-k-2025-i-chto-s-etim-delat',
      ru: 'Чангу: оверсупплай апартаментов и что с ним делать',
      en: 'Canggu: the apartment oversupply and what it means',
    },
    {
      slug: 'off-plan-ili-gotovaya-nedvizhimost-na-bali-gde-dohodnost-gde-riski',
      ru: 'Off-plan или готовое: где доходность, где риски',
      en: 'Off-plan or completed: returns versus risk',
    },
    {
      slug: 'leasehold-ili-freehold-na-bali-chto-dostupno-inostrantsu-v-2026',
      ru: 'Leasehold или freehold: что доступно иностранцу',
      en: 'Leasehold or freehold: what a foreigner can hold',
    },
    {
      slug: 'nalogi-na-nedvizhimost-na-bali-pokupka-vladenie-arenda-prodazha-2026',
      ru: 'Налоги: покупка, владение, аренда, продажа',
      en: 'Taxes: buying, owning, renting out, selling',
    },
  ],
}

export function getRelatedReading(
  kind: ReadingKind,
  lang: Lang,
): { heading: string; links: ReadingLink[] } | null {
  if (lang !== 'ru' && lang !== 'en') return null
  return {
    heading: HEADING[lang],
    links: ARTICLES[kind].map(a => ({
      href: lang === 'ru'
        ? `/ru/znaniya/${a.slug}`
        : `/en/knowledge/${enKnowledgeSlug(a.slug)}`,
      label: lang === 'ru' ? a.ru : a.en,
    })),
  }
}
