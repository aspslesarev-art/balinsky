// English-facing slugs for /en/knowledge/* articles.
//
// Knowledge slugs are generated once from the Russian title (slugify in
// scripts/sync-knowledge.mjs) and shared across both languages. On the English
// site that produces a transliterated-Russian URL that reads as gibberish in a
// Google SERP and kills click-through — even when the page already ranks on
// page 1 (e.g. the tourist-levy article: 376 impressions, position ~8, zero
// clicks). This map overrides the English-facing slug per article.
//
// Pilot: a single article. To roll out, add more `ru-slug: 'english-slug'`
// entries — the loader, detail paths, sitemap and the 301 in middleware all
// read from this map, so a new entry is the only change needed per article.
// Keep English slugs lowercase, hyphenated, ASCII, and stable once published
// (changing one again costs another redirect + reindex cycle).
export const EN_KNOWLEDGE_SLUG_OVERRIDES: Record<string, string> = {
  'turisticheskiy-sbor-na-bali-idr-150-000-kto-platit-i-zachem-investoru-eto-znat':
    'bali-tourist-levy-idr-150000-who-pays',
}

// The English-facing slug for an article, keyed by its shared (Russian) slug:
// the override when present, otherwise the shared slug unchanged.
export function enKnowledgeSlug(ruSlug: string): string {
  return EN_KNOWLEDGE_SLUG_OVERRIDES[ruSlug] ?? ruSlug
}
