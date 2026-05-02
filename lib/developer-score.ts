// Objective developer score: how active and proven is this developer.
//
// Weights pick "готовые ЖК" as the dominant signal — a builder with completed
// projects is a known quantity. Number of total projects + presence of curated
// editorial info on the four reputation dimensions (construction, reputation,
// equipment, management company) refines it.

export type ComplexStats = { total: number; ready: number }

export type DevScoreInput = {
  construction: string | null
  reputation: string | null
  equipment: string | null
  management: string | null
  team?: string | null
  business?: string | null
  yieldText?: string | null
}

const COMPLETED_RE = /(построен|сдан|готов|complet)/i

export function isCompletedComplex(statusOrReadiness: string | null | undefined): boolean {
  if (!statusOrReadiness) return false
  return COMPLETED_RE.test(statusOrReadiness)
}

function asText(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return asText(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return asText((v as Record<string, unknown>).value)
  return ''
}

function richness(text: unknown): number {
  const s = asText(text)
  if (!s) return 0
  // Has text at all? +5. Then small bonus for length, capped.
  const len = s.trim().length
  if (len === 0) return 0
  return 5 + Math.min(15, Math.floor(len / 80))
}

export function scoreDeveloper(stats: ComplexStats, info: DevScoreInput): number {
  const ready = stats.ready ?? 0
  const total = stats.total ?? 0
  const inProgress = Math.max(0, total - ready)

  // Completed projects: strongest signal (100 each).
  // In-progress projects: half weight (50 each) — they're activity, not proof yet.
  // Infos: each filled dimension adds up to ~20 by length-richness.
  const editorialScore =
    richness(info.construction) +
    richness(info.reputation) +
    richness(info.equipment) +
    richness(info.management) +
    Math.min(15, richness(info.team) + richness(info.business) + richness(info.yieldText))

  return ready * 100 + inProgress * 50 + editorialScore
}

export function buildDeveloperStats(complexRows: { data: Record<string, unknown> }[]): Map<string, ComplexStats> {
  const out = new Map<string, ComplexStats>()
  for (const r of complexRows) {
    const dev = (r.data['Developer1'] ?? '').toString().trim()
    if (!dev) continue
    const status = (r.data['Статус'] ?? r.data['Готовность'] ?? '').toString()
    const cur = out.get(dev) ?? { total: 0, ready: 0 }
    cur.total += 1
    if (isCompletedComplex(status)) cur.ready += 1
    out.set(dev, cur)
  }
  return out
}
