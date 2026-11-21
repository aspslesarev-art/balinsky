// /llms.txt (rewrite в next.config.ts) — текст из lib/llms-txt.ts, а число вилл,
// апартаментов и ЖК и диапазоны цен — из тех же списков, что каталог и
// главная. Раньше цифры были вписаны руками и устаревали до следующей правки.
// Обновляется сам: публикация / снятие объекта ставит этот адрес в очередь
// перестройки (lib/row-revalidate.ts); сутки — страховка.
import { LLMS_TXT_TEMPLATE } from '@/lib/llms-txt'
import { loadAll as loadAllVillas } from '@/app/ru/villy/_lib'
import { loadAll as loadAllApartments } from '@/app/ru/apartamenty/_lib'
import { loadAll as loadAllComplexes } from '@/app/ru/zhilye-kompleksy/_lib'

export const revalidate = 86400

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function money(n: number): string {
  if (n >= 1_000_000) return `$${(Math.round(n / 100_000) / 10).toString()}M`
  return `$${Math.round(n / 1000)}K`
}

function range(prices: (number | null | undefined)[]): string {
  const xs = prices.filter((x): x is number => typeof x === 'number' && x > 1000).sort((a, b) => a - b)
  if (!xs.length) return 'prices on request'
  return `${money(xs[0])} to ${money(xs[xs.length - 1])}`
}

// «about 460»: точное число меняется каждый день, текст для ИИ не должен дёргаться.
const about = (n: number) => (n >= 100 ? Math.round(n / 10) * 10 : n).toString()

export async function GET() {
  const [v, a, k] = await Promise.all([loadAllVillas(), loadAllApartments(), loadAllComplexes()])
  const now = new Date()
  const body = LLMS_TXT_TEMPLATE
    .replace('{{asOf}}', `${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`)
    .replace('{{villas}}', about(v.enriched.length))
    .replace('{{villaRange}}', range(v.enriched.map(e => e.priceUsd)))
    .replace('{{apartments}}', about(a.enriched.length))
    .replace('{{aptRange}}', range(a.enriched.map(e => e.priceUsd)))
    .replace('{{complexes}}', about(k.enriched.length))
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
