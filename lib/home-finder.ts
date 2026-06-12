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
  yieldPct: number | null
  ready: boolean
}

const norm = (s: string) => s.trim().toLowerCase()

function readyOf(status: string | null | undefined): boolean {
  if (!status) return false
  return /постро|сдан|готов|заверш|complet|built|ready/i.test(status)
}

// claimedYieldPct is already a percent (14.1). bestCapRate (goodCapRate from
// scores) is a FRACTION (0.2 = 20%) — different scale, so normalise the
// fallback ×100. Drop anything outside a plausible Bali rental band so the
// badge never shows a misleading "0.2%".
function yieldOf(claimed: number | null | undefined, cap: number | null | undefined): number | null {
  let v: number | null = null
  if (claimed != null && Number.isFinite(claimed)) v = claimed
  else if (cap != null && Number.isFinite(cap)) v = cap * 100
  if (v == null || v < 2 || v > 40) return null
  return Math.round(v * 10) / 10
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
    out.push({
      slug: c.slug,
      title: c.title,
      cover: c.photos[0] ?? null,
      priceUsd: c.priceUsd,
      bedrooms: c.bedrooms,
      area: c.area,
      district: slugOf((c as { district?: string | null }).district),
      yieldPct: yieldOf(c.claimedYieldPct, c.bestCapRate),
      ready: readyOf(c.status),
    })
    if (out.length >= 140) break
  }
  return out
}

export async function loadHomeFinder(lang: Lang): Promise<FinderItem[]> {
  return unstable_cache(() => build(lang), ['home-finder-v2', lang], {
    revalidate: 3600,
    tags: ['content:villas'],
  })()
}
