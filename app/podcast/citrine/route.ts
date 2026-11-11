// Сценарий подкаста с застройщиком CITRINE - открытая страница по прямой
// ссылке (решение владельца 2026-11-11), чтобы открыть с планшета в студии.
// Нигде не перелинкована, в поиск не идёт (noindex).
import { PODCAST_CITRINE_HTML } from './html'

export const dynamic = 'force-static'

export function GET() {
  return new Response(PODCAST_CITRINE_HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
