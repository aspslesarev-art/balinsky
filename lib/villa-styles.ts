// Villa interior-style classifications, produced by
// scripts/classify-villa-style.mjs and uploaded to Supabase Storage.
// One source of truth for the catalog filter and the detail page facts row.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_styles.json`

export type VillaStyleEntry = {
  style: string | null
  confidence: 'high' | 'medium' | 'low' | null
  notes?: string
}
export type VillaStylesMap = Record<string, VillaStyleEntry>

// Canonicalises model output — gpt-4o-mini occasionally returns
// "тропический модерн" alongside "Тропический модерн" and similar
// case variants; without this they'd show up as separate filter chips.
function canonicalize(style: string | null | undefined): string | null {
  if (!style) return null
  const lower = style.trim().toLowerCase()
  for (const known of CANONICAL_STYLES) {
    if (known.toLowerCase() === lower) return known
  }
  return style.trim()
}

const CANONICAL_STYLES = [
  'Балийский тропический',
  'Современный минимализм',
  'Тропический модерн',
  'Средиземноморский',
  'Скандинавский',
  'Японский / wabi-sabi',
  'Лофт / индустриальный',
  'Бохо / эклектика',
  'Классический',
  'Колониальный',
]

export async function loadVillaStyles(): Promise<VillaStylesMap> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:villa-styles'] } })
    if (!r.ok) return {}
    const j = await r.json() as { styles?: VillaStylesMap } | VillaStylesMap
    const raw = (j && typeof j === 'object' && 'styles' in j && j.styles)
      ? j.styles as VillaStylesMap
      : j as VillaStylesMap
    const out: VillaStylesMap = {}
    for (const [id, entry] of Object.entries(raw)) {
      out[id] = { ...entry, style: canonicalize(entry?.style ?? null) }
    }
    return out
  } catch {
    return {}
  }
}

export function getVillaStyle(map: VillaStylesMap, villaId: string): string | null {
  const e = map[villaId]
  if (!e || !e.style) return null
  return e.style
}
