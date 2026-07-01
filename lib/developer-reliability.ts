import { getDeveloperStats, type DeveloperStats } from './developer-stats'

// Balinsky reliability index (1.0–5.0). An EDITORIAL score computed from
// objective delivery data (completed / active projects) — NOT user reviews.
// Completed projects are the strongest reliability signal (the developer
// proved it can finish), with a small credit for an active pipeline. The
// rubric is transparent and the label on the page says exactly what it is,
// so it's honest to mark up as an editorial Review (author = Balinsky) rather
// than a fabricated AggregateRating of user ratings.
export function reliabilityScore(stats: Pick<DeveloperStats, 'ready' | 'inProgress'>): number {
  const completed = Math.max(0, stats.ready)
  const active = Math.max(0, stats.inProgress)
  let s = 3.2
  s += Math.min(completed, 6) * 0.28 // +0.28 per completed project (cap 6 → +1.68)
  s += Math.min(active, 3) * 0.06 // small credit for active builds (cap 3 → +0.18)
  return Math.max(1, Math.min(5, Math.round(s * 10) / 10))
}

export type Reliability = { score: number; completed: number; active: number }

/** Reliability index for a developer by name, or null if we have no stats. */
export async function reliabilityForDeveloper(name: string | null | undefined): Promise<Reliability | null> {
  const stats = await getDeveloperStats(name)
  if (!stats || (stats.ready <= 0 && stats.inProgress <= 0)) return null
  return { score: reliabilityScore(stats), completed: stats.ready, active: stats.inProgress }
}
