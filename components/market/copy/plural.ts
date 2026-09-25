// Slavic plural forms for the few counted nouns on the market pages.

/** Polish: 1 rok · 2–4 lata · 5+ lat (12–14 → lat, 22–24 → lata). */
export function plPlural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const d = n % 10, h = n % 100
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}

/** Ukrainian: 1 рік · 2–4 роки · 5+ років (21 рік, 22 роки, 11–14 років). */
export function ukPlural(n: number, one: string, few: string, many: string): string {
  const d = n % 10, h = n % 100
  if (d === 1 && h !== 11) return one
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}
