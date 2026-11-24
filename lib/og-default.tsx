// Общая картинка превью (og:image) для разделов сайта без своей картинки:
// каталоги, новости, знания, гайды. Без неё ссылка в Telegram/WhatsApp
// уходит без фото (SEO-аудит 24.11.2026: 19 из 30 страниц без og:image).
// Текст только латиницей: шрифт next/og по умолчанию не рисует кириллицу.
// Страница без params → картинка собирается один раз при сборке.
import { renderOgImage } from '@/lib/og-image'

export const defaultOgAlt = 'Balinsky - Bali real estate in numbers'

export function renderDefaultOg() {
  return renderOgImage({
    title: 'Bali real estate in numbers',
    subtitle: 'Villas, apartments and residential complexes: prices, rental yields and permit status',
    facts: [
      { label: 'Villas', value: 'Leasehold' },
      { label: 'Rental', value: 'Market data' },
      { label: 'Languages', value: '10' },
    ],
  })
}
