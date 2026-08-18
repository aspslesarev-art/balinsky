// Разбор чисел из прайсов. Форматы в реальных листах: "$115,900",
// "$138 000", " $ 185,000 ", "45.00 m2", "78,7" (запятая как десятичная),
// "1,549" (запятая как разделитель тысяч), "-", "н/д".

const NON_NUMERIC = /[^0-9.,-]/g

// Запятая — разделитель тысяч, если за ней ровно три цифры и перед ней
// что-то есть ("1,549"). Иначе она десятичная ("78,7").
function normalizeSeparators(s: string): string {
  if (s.includes('.') && s.includes(',')) return s.replace(/,/g, '')
  if (/^-?\d+,\d{3}(,\d{3})*$/.test(s)) return s.replace(/,/g, '')
  return s.replace(',', '.')
}

export function parseNum(raw: string | null | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/ /g, ' ').replace(/(?<=\d)\s+(?=\d)/g, '').replace(NON_NUMERIC, '').trim()
  if (!cleaned || cleaned === '-' || cleaned === '.') return null
  const n = Number(normalizeSeparators(cleaned))
  return Number.isFinite(n) ? n : null
}

// Цена. Ноль трактуем как «цены нет»: у части застройщиков проданный
// юнит показывается как "$0", а не пустой ячейкой, и нулевая цена в
// истории выглядела бы как обвал до нуля.
export function parseMoney(raw: string | null | undefined): number | null {
  const n = parseNum(raw)
  if (n === null || n <= 0) return null
  return n
}

// Спальни: "2", "2BR", "3 bed", "1+1".
export function parseBedrooms(raw: string | null | undefined): number | null {
  if (!raw) return null
  const m = raw.match(/(\d+)\s*(?:br|bed|bedroom|спал)/i) ?? raw.match(/^\s*(\d+)\s*$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 0 && n < 30 ? n : null
}

// Строка выглядит как число (а не как слово вроде "SOLD" в колонке цены).
export function looksNumeric(raw: string): boolean {
  return /\d/.test(raw) && parseNum(raw) !== null
}
