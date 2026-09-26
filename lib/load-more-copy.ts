import type { Lang } from './i18n'

// "Show more" button and error line under the catalogue grids, per language.
export const LOAD_MORE: Record<Lang, { more: string; loading: string; failed: string; retry: string }> = {
  ru: { more: 'Показать ещё', loading: 'Загрузка…', failed: 'Не удалось загрузить ещё.', retry: 'Повторить' },
  en: { more: 'Show more', loading: 'Loading…', failed: 'Couldn’t load more.', retry: 'Try again' },
  id: { more: 'Tampilkan lagi', loading: 'Memuat…', failed: 'Gagal memuat lagi.', retry: 'Coba lagi' },
  ban: { more: 'Tampilkan lagi', loading: 'Memuat…', failed: 'Gagal memuat lagi.', retry: 'Coba lagi' },
  fr: { more: 'Voir plus', loading: 'Chargement…', failed: 'Impossible de charger la suite.', retry: 'Réessayer' },
  de: { more: 'Mehr anzeigen', loading: 'Wird geladen…', failed: 'Weitere Einträge konnten nicht geladen werden.', retry: 'Erneut versuchen' },
  zh: { more: '显示更多', loading: '加载中…', failed: '无法加载更多。', retry: '重试' },
  nl: { more: 'Meer tonen', loading: 'Laden…', failed: 'Kon niet meer laden.', retry: 'Opnieuw' },
  pl: { more: 'Pokaż więcej', loading: 'Ładowanie…', failed: 'Nie udało się wczytać więcej.', retry: 'Spróbuj ponownie' },
  uk: { more: 'Показати ще', loading: 'Завантаження…', failed: 'Не вдалося завантажити ще.', retry: 'Повторити' },
}

const LANGS = new Set(Object.keys(LOAD_MORE))

/** `?lang=` from a load-more request; anything unknown is Russian, as before. */
export function langParam(v: string | undefined): Lang {
  return v && LANGS.has(v) ? (v as Lang) : 'ru'
}
