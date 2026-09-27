// Per-developer portfolio counts (complexes / units, total vs completed).

// Tracking complex *and* unit counts. A builder with 2 delivered complexes
// of 300 apartments each has very different obligations than one with 10
// villa-sized projects of 5 units each — the unit numbers surface that.
export type ComplexStats = {
  total: number
  ready: number
  unitsTotal: number
  unitsReady: number
}

const COMPLETED_RE = /(построен|сдан|готов|complet)/i

export function isCompletedComplex(statusOrReadiness: string | null | undefined): boolean {
  if (!statusOrReadiness) return false
  return COMPLETED_RE.test(statusOrReadiness)
}

function unitCount(v: unknown): number {
  // Total quantity of units may arrive as a number, a numeric string, or
  // a single-element array (Airtable's lookup-field shape). Anything we
  // can't read as a positive integer counts as 0 — empty cells shouldn't
  // skew the per-developer aggregate.
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v)
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/[^\d]/g, ''), 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  if (Array.isArray(v) && v.length) return unitCount(v[0])
  return 0
}

export function buildDeveloperStats(complexRows: { data: Record<string, unknown> }[]): Map<string, ComplexStats> {
  const out = new Map<string, ComplexStats>()
  for (const r of complexRows) {
    const dev = (r.data['Developer1'] ?? '').toString().trim()
    if (!dev) continue
    const status = (r.data['Статус'] ?? r.data['Готовность'] ?? '').toString()
    const units = unitCount(r.data['Total quantity of units'])
    const cur = out.get(dev) ?? { total: 0, ready: 0, unitsTotal: 0, unitsReady: 0 }
    cur.total += 1
    cur.unitsTotal += units
    if (isCompletedComplex(status)) {
      cur.ready += 1
      cur.unitsReady += units
    }
    out.set(dev, cur)
  }
  return out
}
