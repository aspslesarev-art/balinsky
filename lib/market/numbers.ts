// Разбор чисел из прайсов. Форматы в реальных листах: "$115,900",
// "$138 000", " $ 185,000 ", "45.00 m2", "78,7" (запятая как десятичная),
// "1,549" (запятая как разделитель тысяч), "-", "н/д".
//
// Отдельная морока — ячейки, где вместо числа лежит фраза или даже
// несколько строк: "1 bedroom villa - $140,000". Наивная чистка от
// нецифрового превращала такое в 1140000, а иногда и в триллионы, и этот
// мусор уезжал в историю цен. Поэтому берём числа токенами и отбираем
// правдоподобный, а не склеиваем всё подряд.

// Юнит на Бали не может стоить меньше пяти тысяч долларов и вряд ли
// стоит больше пятидесяти миллионов. Всё за границами — почти всегда
// цена в рупиях или не та колонка, и в историю такое пускать нельзя.
const PRICE_MIN = 5_000
const PRICE_MAX = 50_000_000

// Площадь в квадратных метрах: меньше метра и больше гектара — не площадь.
const AREA_MIN = 1
const AREA_MAX = 10_000

// Число с разделителями: 115,900 | 138 000 | 45.00 | 78,7.
// Внутрь пускаем только пробел и неразрывный: перевод строки разделяет
// разные числа, и включать его сюда значило бы склеивать соседние строки
// многострочной ячейки в одно число.
const NUMBER_TOKEN = /\d[\d ., ]*/g
// Запятая — разделитель тысяч, если за ней ровно три цифры ("1,549").
// Иначе она десятичная ("78,7").
function normalizeSeparators(s: string): string {
  if (s.includes('.') && s.includes(',')) return s.replace(/,/g, '')
  if (/^\d+(,\d{3})+$/.test(s)) return s.replace(/,/g, '')
  return s.replace(',', '.')
}

// Все числа, которые есть в ячейке, по порядку.
function numbersIn(raw: string): number[] {
  const out: number[] = []
  // Разряды разделяют не только обычным пробелом, но и неразрывным или
  // узким. Приводим их к обычному; переводы строк оставляем — они делят
  // многострочную ячейку на разные числа, а не разряды одного.
  const text = raw.replace(/[^\S\r\n]+/g, ' ')
  for (const m of text.matchAll(NUMBER_TOKEN)) {
    // Пробел внутри числа — разделитель разрядов ("138 000"), но только
    // если он стоит между цифрами: "45 m2 12" — это два числа.
    const cleaned = m[0].replace(/[\s ]+(?=\d{3}\b)/g, '').replace(/[\s ]+$/, '')
    const n = Number(normalizeSeparators(cleaned.replace(/[.,]$/, '')))
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

export function parseNum(raw: string | null | undefined): number | null {
  if (!raw) return null
  const nums = numbersIn(raw)
  return nums.length ? nums[0] : null
}

// Площадь. Из ячейки вида "45.00 m2" берём первое правдоподобное число.
export function parseArea(raw: string | null | undefined): number | null {
  if (!raw) return null
  const n = numbersIn(raw).find(v => v >= AREA_MIN && v <= AREA_MAX)
  return n ?? null
}

// Цена. Берём первое число, похожее на цену юнита: так фраза
// "1 bedroom villa - $140,000" даёт 140000, а не 1.
//
// Ноль трактуем как «цены нет»: у части застройщиков проданный юнит
// показывается как "$0", и нулевая цена в истории выглядела бы как
// обвал до нуля.
export function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null
  const n = numbersIn(raw).find(v => v >= PRICE_MIN && v <= PRICE_MAX)
  return n ?? null
}

// Цена вне разумных границ — повод сказать об этом вслух, а не молча
// проглотить: обычно это колонка в рупиях или вовсе не цена.
export function priceLooksWrong(raw: string | null | undefined): boolean {
  if (!raw) return false
  const nums = numbersIn(raw)
  if (!nums.length) return false
  return !nums.some(v => v >= PRICE_MIN && v <= PRICE_MAX) && nums.some(v => v > PRICE_MAX)
}

// Спальни: "2", "2BR", "3 bed", "1+1".
export function parseBedrooms(raw: string | null | undefined): number | null {
  if (!raw) return null
  const m = raw.match(/(\d+)\s*(?:br|bed|bedroom|спал)/i) ?? raw.match(/^\s*(\d+)\s*$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 0 && n < 30 ? n : null
}

// Строка выглядит числом (а не словом вроде "SOLD" в колонке цены).
export function looksNumeric(raw: string): boolean {
  return /\d/.test(raw) && numbersIn(raw).length > 0
}
