// Editorial risk flags for developers — the human override on top of the
// data-driven index in lib/developer-safety.ts.
//
// Why this file exists: the catalogue data can only see what a developer has
// filed (permits, land zoning, delivered projects). It cannot see a company we
// know is problematic but that simply has no complexes on file — by the numbers
// such a company looks identical to an empty card. A flag here pushes it below
// every scored developer while still keeping it above the blank ones.
//
// Two severities:
//   high   — score capped at 35 (and −25); with no portfolio → `flagged` bucket
//   medium — score capped at 55 (and −12)
//
// `note` is INTERNAL. It is never rendered on the public site — the catalogue
// only ever shows a neutral tier label. Keep it factual and short so the next
// editor understands why the flag is here.
//
// Match is EXACT on the normalized name, same rule as lib/hidden-developers.ts:
// substring matching would catch unrelated companies sharing a word fragment.
// List every spelling the data can carry (RU/EN, with and without the legal
// form) as its own key.

export type RiskSeverity = 'high' | 'medium'

export type DeveloperRisk = {
  severity: RiskSeverity
  /** Internal-only rationale. Not shown to visitors. */
  note: string
}

const RISKS: ReadonlyMap<string, DeveloperRisk> = new Map<string, DeveloperRisk>([
  ['magnum estate', { severity: 'high', note: 'Редакторский флаг: репутационные вопросы по проектам; ни один ЖК в базе не имеет разрешительных документов.' }],
  ['magnum', { severity: 'high', note: 'Алиас Magnum estate.' }],
  ['parq', { severity: 'high', note: 'Редакторский флаг: репутационные вопросы; портфель в базе не заведён.' }],
  ['parq bali', { severity: 'high', note: 'Алиас PARQ.' }],
  ['parq ubud', { severity: 'high', note: 'Алиас PARQ.' }],
  ['vertikal indonesia', { severity: 'high', note: 'Редакторский флаг: репутационные вопросы; портфель в базе не заведён.' }],
  ['vertikal', { severity: 'high', note: 'Алиас Vertikal Indonesia.' }],
  ['вертикаль', { severity: 'high', note: 'Алиас Vertikal Indonesia.' }],
])

function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-zа-я0-9]+/g, ' ').trim()
}

/**
 * First matching flag across every name variant we can supply
 * (Developer / Developer1 / freeform), or null when the developer is clean.
 */
export function developerRisk(...signals: Array<string | null | undefined>): DeveloperRisk | null {
  for (const s of signals) {
    const hit = RISKS.get(normalize(s))
    if (hit) return hit
  }
  return null
}
