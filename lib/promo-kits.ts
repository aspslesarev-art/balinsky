// Готовые сторис для агентов (без названия объекта и застройщика) —
// complex-photos/promo/_promo.json, ключ — airtable_id комплекса. Показываются
// плиткой «Реклама» в медиаблоке виллы и комплекса.
const URL_ = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/complex-photos/promo/_promo.json`

/** files — полные PNG 1080×1920 для сохранения, thumbs — лёгкие JPG 540×960 для сетки. */
export type PromoKit = { series: { title: string; files: string[]; thumbs?: string[] }[] }

export async function loadPromoKit(complexAirtableId: string | null): Promise<PromoKit | null> {
  if (!complexAirtableId) return null
  try {
    const r = await fetch(URL_, { next: { revalidate: 3600, tags: ['content:villas', 'content:complexes'] } })
    if (!r.ok) return null
    const all = (await r.json()) as Record<string, { series?: PromoKit['series'] }>
    const kit = all[complexAirtableId]
    const series = (kit?.series ?? []).filter(s => s.files?.length)
    return series.length ? { series } : null
  } catch {
    return null
  }
}
