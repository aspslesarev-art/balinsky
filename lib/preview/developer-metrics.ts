// Helpers for the developer-page template prototype.
//
// The design's `developer_stats` block wants numbers (years_on_market,
// portfolio_volume_usd, team_size...). Supabase stores them only as free-text
// bullet lines written by editors, e.g. "• 4 года на рынке недвижимости".
// These parsers pull the numbers back out and report how many were found,
// so the preview can flag the block as "derived, not stored".

export function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

export function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.,-]/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return numberOrNull(v[0])
  return null
}

export function parseBullets(s: string | null): string[] {
  if (!s) return []
  const trimmed = s.trim()
  if (!trimmed || /^(не известно|no data|нет данных)$/i.test(trimmed)) return []
  return trimmed
    .split('\n')
    .map(line => line.replace(/^[\s•\-–—·*]+/, '').trim())
    .filter(Boolean)
    // The EN twins carry a trailing SEO sentence the editors appended; it is
    // prose, not a bullet, and would render as a stray list item.
    .filter(line => !/^this is (information|the technology)/i.test(line))
}

export type DeveloperMetrics = {
  yearsOnMarket: number | null
  portfolioVolumeUsd: number | null
  unitsUnderConstruction: number | null
  unitsRenting: number | null
  teamSize: number | null
  buildersCount: number | null
  complexesDone: number | null
  complexesBuilding: number | null
  /** How many of the six headline numbers were recognised in the bullet text. */
  parsedCount: number
}

type BulletCard = { key: string; items: string[] }
type ComplexLike = { status: 'building' | 'completed'; unitsCount: number | null }

function find(items: string[], re: RegExp): number | null {
  for (const line of items) {
    const m = line.match(re)
    if (m) {
      const n = Number(m[1].replace(',', '.'))
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

export function extractMetrics(cards: BulletCard[], complexes: ComplexLike[]): DeveloperMetrics {
  const of = (key: string) => cards.find(c => c.key === key)?.items ?? []
  const reputation = of('reputation')
  const construction = of('construction')
  const team = of('team')
  const business = of('business')

  const yearsOnMarket = find(reputation, /(\d+[.,]?\d*)\s*(?:год|года|лет)(?![а-яё])/i)
  // "$9,5 m" / "$9.5 млн" / "9,5 млн $"
  const volumeRaw = find(reputation, /\$?\s*(\d+[.,]?\d*)\s*(?:m\b|млн)/i)
  const portfolioVolumeUsd = volumeRaw != null ? Math.round(volumeRaw * 1_000_000) : null
  const unitsUnderConstruction =
    find(construction, /(\d+)\s*(?:вилл\w*|юнит\w*|объект\w*)[^\n]*строительств/i)
    ?? find(construction, /(\d+)[^\n]*строятся/i)
  const unitsRenting =
    find(construction, /(\d+)\s*(?:вилл\w*|юнит\w*|объект\w*)[^\n]*аренд/i)
    ?? find(construction, /(\d+)[^\n]*сдаются/i)
  const teamSize = find(team, /(\d+)\s*сотрудник/i)
  const buildersCount = find(team, /(\d+)\s*строител/i)
  const complexesDone =
    find(business, /(\d+)\s*(?:готов\w*|сдан\w*)\s*комплекс/i)
    ?? (complexes.filter(c => c.status === 'completed').length || null)
  const complexesBuilding =
    find(business, /(\d+)\s*комплекс\w*\s*в\s*строительств/i)
    ?? (complexes.filter(c => c.status === 'building').length || null)

  const headline = [yearsOnMarket, portfolioVolumeUsd, unitsUnderConstruction, unitsRenting, teamSize, buildersCount]
  return {
    yearsOnMarket,
    portfolioVolumeUsd,
    unitsUnderConstruction,
    unitsRenting,
    teamSize,
    buildersCount,
    complexesDone,
    complexesBuilding,
    parsedCount: headline.filter(v => v != null).length,
  }
}

/** "$9 500 000" -> "$9,5 млн"; the design shows compact money in the stat row. */
export function compactUsd(n: number | null): string | null {
  if (n == null) return null
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `$${(Math.round(m * 10) / 10).toString().replace('.', ',')} млн`
  }
  return '$' + n.toLocaleString('ru-RU').replace(/ /g, ' ')
}

export function fullUsd(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
