// Guest columnists. An article in the knowledge manifest points at one of
// these through `author.slug`; the byline, the author page and the Article
// JSON-LD take the localized name and role from here, because the manifest
// stores only the Russian strings.

import type { Lang } from './i18n'
import type { KnowledgeAuthor } from './knowledge'

export type Author = {
  slug: string
  name: Record<Lang, string>
  role: Record<Lang, string>
  // Author page text. Only ru and en have a page (/ru/avtory, /en/authors).
  bio: { ru: string[]; en: string[] }
  links: { label: string; url: string }[]
  photo: string | null
}

export const AUTHORS: Record<string, Author> = {
  'evgeniy-zhuykov': {
    slug: 'evgeniy-zhuykov',
    name: {
      ru: 'Евгений Жуйков', en: 'Evgeny Zhuikov', id: 'Evgeny Zhuikov', fr: 'Evgeny Zhuikov',
      de: 'Jewgeni Schuikow', zh: '叶夫根尼·茹伊科夫', nl: 'Evgeny Zhuikov', ban: 'Evgeny Zhuikov',
      pl: 'Jewgienij Żujkow', uk: 'Євген Жуйков',
    },
    role: {
      ru: 'Инвестиционный аналитик, автор колонки',
      en: 'Investment analyst, columnist',
      id: 'Analis investasi, kolumnis',
      fr: 'Analyste en investissement, chroniqueur',
      de: 'Investmentanalyst, Kolumnist',
      zh: '投资分析师，专栏作者',
      nl: 'Investeringsanalist, columnist',
      ban: 'Analis investasi, kolumnis',
      pl: 'Analityk inwestycyjny, felietonista',
      uk: 'Інвестиційний аналітик, автор колонки',
    },
    bio: {
      ru: [
        'Инвестиционный аналитик, автор Telegram-канала Advisors. Пишет о рынке недвижимости Бали без рекламы: считает реальную доходность, налоги и риски.',
        'С 2012 года анализирует инвестиционные продукты, с 2015-го - проекты в реальном секторе.',
        'В 2021–2022 годах - инвестиционный советник в реестре Банка России (№ 105).',
        'В 2022–2023 годах - операционный директор девелоперской компании Golden Tree на Бали. Делал исследования рынка для отельных проектов на Буките.',
        'Приглашённый лектор «МКБ Инвестиции», аттестат ФСФР 1.0.',
      ],
      en: [
        'Investment analyst and author of the Advisors Telegram channel. Writes about the Bali property market without the sales pitch: real yields, taxes and risks.',
        'Has analysed investment products since 2012 and real-economy projects since 2015.',
        'In 2021–2022 he was an investment adviser on the Bank of Russia register (No. 105).',
        'In 2022–2023 he was chief operating officer at Golden Tree, a property developer in Bali. He has done market research for hotel projects on the Bukit peninsula.',
        'Guest lecturer at MKB Investments; holds the Russian FFMS 1.0 qualification certificate.',
      ],
    },
    links: [{ label: 'Telegram: Advisors', url: 'https://t.me/advisorsz' }],
    photo: null,
  },
}

export function getAuthor(slug: string | null | undefined): Author | null {
  return slug ? AUTHORS[slug] ?? null : null
}

/** The manifest byline, with name and role swapped for the localized ones. */
export function localizeAuthor(a: KnowledgeAuthor, lang: Lang): KnowledgeAuthor {
  const known = getAuthor(a.slug)
  if (!known) return a
  return { ...a, name: known.name[lang], role: known.role[lang], photo: a.photo ?? known.photo }
}

export function authorPath(slug: string, lang: Lang): string {
  return lang === 'ru' ? `/ru/avtory/${slug}` : `/en/authors/${slug}`
}
