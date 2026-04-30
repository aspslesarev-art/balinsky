export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
  return Math.round(n) + ' $'
}
export function fmtUsdShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M $'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'k $'
  return Math.round(n) + ' $'
}
export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return (n * 100).toFixed(digits) + '%'
}
export function fmtYears(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n > 100) return '>100 лет'
  return n < 10 ? `${n.toFixed(1)} лет` : `${Math.round(n)} лет`
}
export function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`
  return `${km.toFixed(1)} км`
}
export function fmtMeters(m: number): string {
  if (m < 1000) return `${Math.round(m)} м`
  return `${(m / 1000).toFixed(1)} км`
}
export function pluralRu(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}
