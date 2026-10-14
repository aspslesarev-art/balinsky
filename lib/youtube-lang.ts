// Spoken language of the YouTube videos the site links to (lib/youtube-lang.json,
// filled by scripts/youtube-languages.py from YouTube's own caption/audio data).
//
// Owner's rule (2026-10-14): a Russian video shows only on the Russian site.
// Ukrainian ones also on /ua. Videos without speech, or in any other language,
// follow the title: a Cyrillic title stays on ru/uk.
import SPOKEN from './youtube-lang.json'
import type { Lang } from './i18n'

const ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/

export function youtubeSpoken(url: string | null | undefined): string | null {
  const id = url?.match(ID_RE)?.[1]
  return id ? ((SPOKEN as Record<string, string>)[id] ?? null) : null
}

/** true/false when the video's language is known, null when it is not (caller falls back). */
export function youtubeVisibleOn(url: string | null | undefined, lang: Lang, title?: string | null): boolean | null {
  const spoken = youtubeSpoken(url)
  if (!spoken) return null
  if (spoken === 'ru') return lang === 'ru'
  if (spoken === 'uk') return lang === 'ru' || lang === 'uk'
  return lang === 'ru' || lang === 'uk' || !/[А-Яа-яЁёІіЇїЄє]/.test(title ?? '')
}
