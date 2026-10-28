// Настройки калькулятора доходности, которые агент выставил на странице
// объекта, — для PDF-презентации (владелец 28.10.2026). Калькулятор пишет,
// окно скачивания читает и кладёт в адрес печатной страницы. Только этот
// браузер: localStorage, без сервера.

export type DailyCalc = { mode: 'daily'; price: number; adr: number; occ: number; mgmt: number; tax: string }
export type MonthlyCalc = { mode: 'monthly'; price: number; rent: number; months: number; agent: number; tax: string }
export type CalcSettings = DailyCalc | MonthlyCalc

const key = (id: string) => `bx_calc_${id}`

export function saveCalc(id: string, s: CalcSettings) {
  try { localStorage.setItem(key(id), JSON.stringify({ ...s, at: Date.now() })) } catch {}
}

export function readCalc(id: string): CalcSettings | null {
  try {
    const raw = localStorage.getItem(key(id))
    if (!raw) return null
    const s = JSON.parse(raw) as CalcSettings & { at?: number }
    // Через сутки настройки уже не «только что выставленные» — берём расчёт по умолчанию.
    if (!s.at || Date.now() - s.at > 24 * 3600 * 1000) return null
    return s
  } catch { return null }
}

/** Настройки → параметры адреса печатной страницы и обратно. */
export function calcToQuery(s: CalcSettings): Record<string, string> {
  return s.mode === 'daily'
    ? { cm: 'd', cp: String(s.price), ca: String(s.adr), co: String(s.occ), cg: String(s.mgmt), ct: s.tax }
    : { cm: 'm', cp: String(s.price), cr: String(s.rent), cn: String(s.months), cg: String(s.agent), ct: s.tax }
}

export function calcFromQuery(q: Record<string, string | undefined>): CalcSettings | null {
  const n = (v: string | undefined) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
  const tax = q.ct === 'resident' || q.ct === 'nonResident' ? q.ct : 'beforeTax'
  const price = n(q.cp)
  if (price == null) return null
  if (q.cm === 'd') {
    const adr = n(q.ca), occ = n(q.co), mgmt = n(q.cg)
    return adr != null && occ != null && mgmt != null ? { mode: 'daily', price, adr, occ, mgmt, tax } : null
  }
  if (q.cm === 'm') {
    const rent = n(q.cr), months = n(q.cn), agent = n(q.cg)
    return rent != null && months != null && agent != null ? { mode: 'monthly', price, rent, months, agent, tax } : null
  }
  return null
}
