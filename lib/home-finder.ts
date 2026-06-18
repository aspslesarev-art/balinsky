import { unstable_cache } from 'next/cache'
import {
  loadAll as loadVillas,
  buildAllCards as buildVillaCards,
  EMPTY_FILTERS as VILLA_EMPTY,
} from '@/app/ru/villy/_lib'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { getDistrictCopy } from '@/lib/districts'
import type { Lang } from '@/lib/i18n'

// Compact, pre-ranked pool of villas for the homepage guided finder. The client
// component filters this in-browser by goal / budget / vibe (no round-trip), so
// a buyer goes from "I want X" to a ranked shortlist in three taps. Cards are
// already in smart-rank order (investment score + views + freshness), so taking
// the first N that match a filter gives the best ones first.

const DISTRICT_SLUGS = [
  'canggu', 'berawa', 'pererenan', 'seseh', 'cemagi', 'nyanyi', 'kedungu',
  'umalas', 'kerobokan', 'batu-bolong', 'batu-belig',
  'sanur', 'nusa-dua', 'jimbaran',
  'uluwatu', 'ungasan', 'melasti', 'pandawa', 'gwk', 'bukit',
  'ubud',
]

export type FinderItem = {
  slug: string
  title: string
  cover: string | null
  priceUsd: number | null
  bedrooms: number | null
  area: number | null
  district: string | null // slug
  // Badge number: our cap rate if we have one, else the developer's claimed
  // yield (so the card isn't blank). Display only — NOT the invest sort key.
  yieldPct: number | null
  // Our own conservative cap rate (%), computed from Booking competitors. This
  // is what the invest sort ranks by — the developer's claimed yield is too
  // often inflated (esp. inland Ubud) and must not float a listing to the top.
  // null when we can't stand behind a number (no comps, or yellow land).
  capRatePct: number | null
  ready: boolean
}

const norm = (s: string) => s.trim().toLowerCase()

function readyOf(status: string | null | undefined): boolean {
  if (!status) return false
  return /постро|сдан|готов|заверш|complet|built|ready/i.test(status)
}

// Band-check + round a percent; drop anything outside a plausible Bali rental
// band so we never surface a misleading "0.2%" or "120%".
function bandPct(v: number | null): number | null {
  if (v == null || !Number.isFinite(v) || v < 2 || v > 40) return null
  return Math.round(v * 10) / 10
}

// Our own cap rate (bestCapRate is a FRACTION, 0.2 = 20% → ×100). The honest
// ranking signal. Null when we have no number to stand behind.
function capRateOf(cap: number | null | undefined): number | null {
  return cap != null && Number.isFinite(cap) ? bandPct(cap * 100) : null
}

// Display badge: prefer our cap rate; fall back to the developer's claimed
// yield (already a percent) only so the card shows *something*. Never the sort
// key. Returns null for rental-restricted (yellow) land — no daily yield there.
function badgeYield(cap: number | null | undefined, claimed: number | null | undefined): number | null {
  const ours = capRateOf(cap)
  if (ours != null) return ours
  return claimed != null && Number.isFinite(claimed) ? bandPct(claimed) : null
}

async function build(lang: Lang): Promise<FinderItem[]> {
  const [villas, scores] = await Promise.all([loadVillas(), loadAllVillaScores()])
  const cards = buildVillaCards(villas.enriched, villas.manifest, VILLA_EMPTY, scores, 'investment-desc', undefined, lang)

  // Raw (usually Latin) district name → canonical slug. Match against both
  // languages' display names + the slug itself, with a contains fallback for
  // sub-areas ("Canggu - Berawa", "Pererenan Beach").
  const nameToSlug = new Map<string, string>()
  for (const s of DISTRICT_SLUGS) {
    for (const l of ['en', 'ru'] as const) {
      const c = getDistrictCopy(s, l)
      if (c) nameToSlug.set(norm(c.name), s)
    }
    nameToSlug.set(s, s)
  }
  const slugOf = (district: string | null | undefined): string | null => {
    if (!district) return null
    const n = norm(district)
    if (nameToSlug.has(n)) return nameToSlug.get(n)!
    for (const [name, slug] of nameToSlug) if (n.includes(name)) return slug
    return null
  }

  const out: FinderItem[] = []
  for (const c of cards) {
    if (c.priceUsd == null) continue
    // Rank by the MEDIAN (realistic) cap rate — p50 ADR × ~65% occupancy —
    // not the optimistic `goodCapRate` the card carries as bestCapRate. The
    // optimistic ceiling massively over-rates high-variance inland markets:
    // Ubud Dream's good=17% but median=6%, so ranking on `good` floated Ubud
    // to the top of "investment". Yellow land has no median (rental illegal).
    const medianCap = c.rentalRestricted ? null : (scores.get(c.id)?.capRate ?? null)
    out.push({
      slug: c.slug,
      title: c.title,
      cover: c.photos[0] ?? null,
      priceUsd: c.priceUsd,
      bedrooms: c.bedrooms,
      area: c.area,
      district: slugOf((c as { district?: string | null }).district),
      yieldPct: c.rentalRestricted ? null : badgeYield(medianCap, c.claimedYieldPct),
      capRatePct: capRateOf(medianCap),
      ready: readyOf(c.status),
    })
    if (out.length >= 140) break
  }
  return out
}

export async function loadHomeFinder(lang: Lang): Promise<FinderItem[]> {
  return unstable_cache(() => build(lang), ['home-finder-v4', lang], {
    revalidate: 3600,
    tags: ['content:villas'],
  })()
}
