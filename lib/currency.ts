// Static cross rates against USD. Long-form rentals + Bali real estate price
// drift slowly enough that a manually-curated rate is fine; refresh quarterly.
export const CURRENCY_RATES = {
  USD: 1,
  EUR: 0.92,
  RUB: 100,
  UAH: 41,
  IDR: 16400,
} as const

export type Currency = keyof typeof CURRENCY_RATES

export const ALL_CURRENCIES: Currency[] = ['USD', 'EUR', 'RUB', 'UAH', 'IDR']

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && v in CURRENCY_RATES
}

// IDR numbers naturally hit billions even for entry-level properties
// (Rp 6,500,000,000 = ~$400k). Compact form keeps cards readable.
function formatIdrCompact(value: number): string {
  if (value >= 1_000_000_000) {
    const v = value / 1_000_000_000
    return 'Rp ' + (Math.round(v * 10) / 10).toString().replace('.', ',') + ' MLRD'
  }
  if (value >= 1_000_000) {
    const v = value / 1_000_000
    return 'Rp ' + (Math.round(v * 10) / 10).toString().replace('.', ',') + ' MLN'
  }
  if (value >= 1_000) {
    return 'Rp ' + Math.round(value / 1_000) + ' K'
  }
  return 'Rp ' + Math.round(value).toString()
}

export function formatPrice(usd: number, currency: Currency): string {
  if (!Number.isFinite(usd)) return '—'
  const value = usd * CURRENCY_RATES[currency]
  switch (currency) {
    case 'USD': return '$' + Math.round(value).toLocaleString('en-US')
    case 'EUR': return '€' + Math.round(value).toLocaleString('de-DE')
    case 'RUB': return Math.round(value).toLocaleString('ru-RU') + ' ₽'
    case 'UAH': return Math.round(value).toLocaleString('uk-UA') + ' ₴'
    case 'IDR': return formatIdrCompact(value)
  }
}
