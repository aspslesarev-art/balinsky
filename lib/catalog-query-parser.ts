// Бесплатный разбор поисковой фразы в фильтры каталога — без ИИ, по правилам.
//
// «вилла 2 спальни Чангу до 300000» в обычном текстовом поиске не находила
// ничего: такой фразы нет ни в одном названии. Здесь из неё достаются тип
// (вилла / апартаменты), спальни, район (в том числе группа «весь Чангу»)
// и цена «до/от», а остаток, если в нём что-то осталось, идёт обычным
// текстовым поиском. Платный ИИ-поиск (/ru/poisk) этим не заменяется и не
// вызывается.
//
// Цена без валюты считается в долларах: каталог хранит цены в USD. «₽/руб»,
// «€», «Rp/juta/miliar» пересчитываются по тем же курсам, что и показ цен.
import { CURRENCY_RATES, type Currency } from './currency'
import { districtNamePairs } from './district-ru'
import { DISTRICT_GROUPS, type DistrictGroupId } from './district-groups'

export type ParsedCatalogQuery = {
  kind: 'villy' | 'apartamenty' | null
  bedrooms: string[]
  district: string[]
  priceMin: number | null
  priceMax: number | null
  // Что осталось после разбора — для обычного текстового поиска.
  rest: string
  // Удалось ли достать хоть один фильтр.
  structured: boolean
}

const STOP = new Set([
  'в', 'во', 'на', 'с', 'со', 'и', 'для', 'по', 'за', 'у', 'около', 'рядом', 'район', 'районе', 'районы',
  'купить', 'куплю', 'продажа', 'продается', 'продаётся', 'ищу', 'нужна', 'нужен', 'нужны', 'хочу', 'бали', 'балі',
  'цена', 'цене', 'стоимость', 'бюджет', 'весь', 'вся', 'всё', 'все', 'стоимостью',
  'in', 'on', 'at', 'with', 'for', 'sale', 'buy', 'bali', 'a', 'an', 'the', 'and', 'of', 'near', 'area',
  'price', 'budget', 'all', 'whole', 'looking', 'want',
])

const GROUP_WORDS: [RegExp, DistrictGroupId][] = [
  [/(^|[^a-zа-яё])(чанг[уеа]?|canggu|changgu|changu)(?=$|[^a-zа-яё])/i, 'canggu'],
  [/(^|[^a-zа-яё])(букит[еау]?|bukit)(?=$|[^a-zа-яё])/i, 'bukit'],
  [/(^|[^a-zа-яё])(убуд[еау]?|ubud)(?=$|[^a-zа-яё])/i, 'ubud'],
]

const NUM_WORDS: Record<string, string> = {
  'одн': '1', 'одно': '1', 'одна': '1', 'один': '1', 'one': '1',
  'двух': '2', 'две': '2', 'два': '2', 'two': '2',
  'трех': '3', 'трёх': '3', 'три': '3', 'three': '3',
  'четырех': '4', 'четырёх': '4', 'четыре': '4', 'four': '4',
  'пяти': '5', 'пять': '5', 'five': '5',
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Число с суффиксом в долларах: «300к», «1,5 млн», «300 000», «$300k».
function toUsd(numRaw: string, suffix: string, currency: Currency): number | null {
  const n = Number(numRaw.replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  const s = suffix.toLowerCase()
  let v = n
  if (/^(k|к|тыс|тысяч|thousand|rb|ribu)/.test(s)) v = n * 1_000
  else if (/^(m|м|млн|миллион|mln|mio|million|juta|jt)/.test(s)) v = n * 1_000_000
  else if (/^(b|млрд|миллиард|bn|billion|miliar|milyar|m(?:ld|rd))/.test(s)) v = n * 1_000_000_000
  // Голое «до 300» в долларах — это 300 тысяч: вилл за $300 не бывает.
  else if (currency === 'USD' && n < 10_000) v = n * 1_000
  return Math.round(v / CURRENCY_RATES[currency])
}

function currencyOf(text: string): Currency {
  if (/₽|руб|rub/i.test(text)) return 'RUB'
  if (/€|eur|евро/i.test(text)) return 'EUR'
  if (/₴|грн|uah/i.test(text)) return 'UAH'
  if (/\brp\b|idr|rupiah|рупи|juta|miliar|milyar/i.test(text)) return 'IDR'
  return 'USD'
}

const NUM = String.raw`(\d+(?:[.,]\d+)?(?:\s\d{3})*)`
const SUF = String.raw`\s*(k|к|тыс\.?|тысяч|thousand|m\b|м(?![а-я])|млн\.?|миллион[a-zа-я]*|mln|mio|million|juta|jt|млрд|миллиард[a-zа-я]*|bn|billion|miliar|milyar)?`
const CUR = String.raw`\s*(?:\$|usd|долл[a-zа-я]*|₽|руб[a-zа-я]*|€|eur|евро|rp|idr)?\.?`

export function parseCatalogQuery(input: string): ParsedCatalogQuery {
  let text = ` ${input.toLowerCase().replace(/ё/g, 'е')} `
  const out: ParsedCatalogQuery = { kind: null, bedrooms: [], district: [], priceMin: null, priceMax: null, rest: '', structured: false }
  const cut = (re: RegExp) => { text = text.replace(re, ' ') }

  // Тип объекта.
  if (/апарт|квартир|кондо|apart|flat|condo|studio|студи/.test(text)) out.kind = 'apartamenty'
  else if (/вилл|(^|[^а-я])дом(а|ик)?(?=$|[^а-я])|villa|house|home/.test(text)) out.kind = 'villy'
  cut(/(апарт[a-zа-я]*|квартир[a-zа-я]*|кондо[a-zа-я]*|apartments?|flats?|condos?|studios?|студи[a-zа-я]*|вилл[a-zа-я]*|(?<![а-я])дом(?:[аы]|ик[а-я]*)?(?![а-я])|villas?|houses?|homes?)/g)

  // Цена: «от X до Y», «X–Y», «до X», «от X», «under/below/up to X», «< X».
  const currency = currencyOf(text)
  const P = `${CUR}${NUM}${SUF}${CUR}`
  const range = new RegExp(String.raw`(?:от|from)?\s*${P}\s*(?:-|–|—|до|to)\s*${P}`, 'i')
  const max = new RegExp(String.raw`(?:до|не дороже|дешевле|max|under|below|up to|upto|less than|<|≤)\s*${P}`, 'i')
  const min = new RegExp(String.raw`(?:от|дороже|min|from|over|above|more than|>|≥)\s*${P}`, 'i')
  const m1 = text.match(range)
  if (m1 && (m1[2] || m1[4] || /\d{4,}/.test(m1[1]))) {
    // «300-500k»: суффикс с правой границы действует и на левую.
    const suf = m1[4] ?? m1[2] ?? ''
    out.priceMin = toUsd(m1[1], m1[2] ?? suf, currency)
    out.priceMax = toUsd(m1[3], suf, currency)
    cut(range)
  }
  const m2 = out.priceMax == null ? text.match(max) : null
  if (m2) { out.priceMax = toUsd(m2[1], m2[2] ?? '', currency); cut(max) }
  const m3 = out.priceMin == null ? text.match(min) : null
  if (m3) { out.priceMin = toUsd(m3[1], m3[2] ?? '', currency); cut(min) }
  // Голая сумма со знаком валюты или суффиксом — потолок бюджета: «$300k».
  if (out.priceMin == null && out.priceMax == null) {
    const bare = new RegExp(String.raw`(?:\$\s*${NUM}${SUF}|${NUM}\s*(k|к|тыс\.?|млн\.?|m\b|mln|juta|jt|miliar)\s*(?:\$|usd|долл[a-zа-я]*|₽|руб[a-zа-я]*|€|rp)?)`, 'i')
    const m4 = text.match(bare)
    if (m4) {
      out.priceMax = m4[1] ? toUsd(m4[1], m4[2] ?? '', currency) : toUsd(m4[3], m4[4] ?? '', currency)
      cut(bare)
    }
  }
  cut(/(\$|usd|долл[a-zа-я]*|₽|руб[a-zа-я]*|€|eur|евро|rp\b|idr|rupiah)/g)

  // Спальни: «2 спальни», «2-х спальная», «2br», «2 bedroom», «двухспальная», «2-комнатная».
  const bedNum = /(\d)\s*(?:-?\s*х)?\s*-?\s*(?:спал[a-zа-я]*|сп(?![а-я])|комн[a-zа-я]*|br\b|bd\b|bed[a-zа-я]*|bhk|kamar|chambres?|schlafzimmer|slaapkamers?|sypial[a-zа-я]*)/i
  const bedWord = /(одно|двух|трех|четырех|пяти|one|two|three|four|five)\s*-?\s*(?:спал[a-zа-я]*|комн[a-zа-я]*|bed[a-zа-я]*)/i
  const mb = text.match(bedNum)
  if (mb) { out.bedrooms = [mb[1]]; cut(bedNum) }
  else {
    const mw = text.match(bedWord)
    if (mw && NUM_WORDS[mw[1]]) { out.bedrooms = [NUM_WORDS[mw[1]]]; cut(bedWord) }
  }
  if (/студи|studio/.test(input.toLowerCase()) && out.bedrooms.length === 0) out.bedrooms = ['1']

  // Район: сначала группы («Чангу» = весь Чангу), потом отдельные локации.
  for (const [re, id] of GROUP_WORDS) {
    if (re.test(text)) { out.district.push(...DISTRICT_GROUPS[id]); text = text.replace(re, '$1 ') }
  }
  for (const [latin, ru] of districtNamePairs()) {
    if (out.district.includes(latin)) continue
    const names = [latin.toLowerCase(), ru.toLowerCase().replace(/ё/g, 'е')]
    for (const name of names) {
      // Русская форма в падеже: «в Бераве», «на Сануре» — по основе без
      // последней гласной (не короче 4 букв, чтобы не цеплять случайные слова).
      const stem = /[аеиоуыяюэ]$/.test(name) && name.length > 4 ? name.slice(0, -1) : name
      const re = new RegExp(`(^|[^a-zа-я])${escapeRe(stem)}[a-zа-я]{0,3}(?=$|[^a-zа-я])`, 'i')
      if (re.test(text)) { out.district.push(latin); text = text.replace(re, '$1 '); break }
    }
  }

  out.rest = text
    .split(/[\s,.;:!?()«»"']+/)
    .filter(w => w && !STOP.has(w) && !/^\d+$/.test(w) && w.length > 1)
    .join(' ')
  out.structured = out.kind != null || out.bedrooms.length > 0 || out.district.length > 0
    || out.priceMin != null || out.priceMax != null
  return out
}

// Query-строка каталога из разбора: ?district=…&bedrooms=…&price_max=…&q=…
export function parsedToSearchParams(p: ParsedCatalogQuery): URLSearchParams {
  const sp = new URLSearchParams()
  if (p.rest) sp.set('q', p.rest)
  if (p.priceMin != null) sp.set('price_min', String(p.priceMin))
  if (p.priceMax != null) sp.set('price_max', String(p.priceMax))
  if (p.district.length) sp.set('district', p.district.join(','))
  if (p.bedrooms.length) sp.set('bedrooms', p.bedrooms.join(','))
  return sp
}
