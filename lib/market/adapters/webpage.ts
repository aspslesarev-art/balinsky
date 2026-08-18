// Разбор обычной веб-страницы застройщика.
//
// Последний рубеж для источников, у которых нет ни таблицы, ни API:
// генплан на лендинге, страница проекта на Тильде. Снимаем со страницы
// текст и отдаём модели — как со страницами Notion. Результат кешируется
// по хешу текста, поэтому неизменившийся лендинг ничего не стоит.
//
// Клиентские SPA сюда не попадают: если в HTML нет ни одной цены, честнее
// сказать об этом, чем выдумывать содержимое.

import { createHash } from 'crypto'
import type { ExtractResult, ScrapedUnit } from '../types'
import { extractUnitsFromText } from '../text-units'

export type WebpageScrape = ExtractResult & { textHash: string }

export async function scrapeWebpage(
  sourceUrl: string,
  meta: { developer: string; complex: string },
  cache: { textHash: string; units: ScrapedUnit[] } | null,
): Promise<WebpageScrape> {
  const html = await fetchHtml(sourceUrl)
  const text = htmlToText(html)
  if (text.length < 200) {
    throw new Error('страница почти без текста — скорее всего содержимое подгружается скриптами')
  }

  const textHash = createHash('sha1').update(text).digest('hex').slice(0, 16)
  if (cache && cache.textHash === textHash && cache.units.length) {
    return { units: cache.units, warnings: [], textHash }
  }

  const { units, warnings } = await extractUnitsFromText(text, meta)
  return { units, warnings, textHash }
}

async function fetchHtml(url: string): Promise<string> {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: {
      // Часть лендингов закрыта от «голых» запросов и отвечает 403, если
      // не представиться браузером.
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0 Safari/537.36',
      'Accept-Language': 'ru,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!r.ok) throw new Error(`сайт вернул ${r.status} — страница закрыта для прямого запроса`)
  return r.text()
}

// Скрипты и стили выбрасываем целиком: там мегабайты минифицированного
// кода, из которого модели нечего взять.
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}
