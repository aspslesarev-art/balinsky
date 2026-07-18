import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

// Non-canonical paths every crawler should skip. Listed once and
// reused across all rule blocks below.
const DISALLOW = [
  '/api/',
  '/ru/*/karta',
  // Catalog hit with ?q= or ?developer= etc is non-canonical — we 301
  // canonical filters to clean URLs, but bots love to find leftover
  // ?_rsc tokens, so block the whole query-param surface.
  '/*?',
  // Private surfaces — wishlist + admin.
  '/ru/izbrannoe',
  '/en/favourites',
  '/admin',
]

// Modern AI-search crawlers we want to explicitly green-light. Without
// a per-agent block they fall under the catch-all '*' rule, but some
// hosting platforms (Cloudflare AI Audit, Vercel Bot Mitigation, etc.)
// look for explicit Allow tokens before letting them through — so we
// list them by name. Mix of search-time crawlers and training crawlers.
const AI_USER_AGENTS = [
  // OpenAI
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic
  'ClaudeBot',
  'Claude-SearchBot',
  'anthropic-ai',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Google AI (Gemini) — separate from Googlebot
  'Google-Extended',
  // Apple Intelligence
  'Applebot-Extended',
  // Yandex AI (Нейро)
  'YandexAdditional',
  // Microsoft Bing — ChatGPT search leans on the Bing index, so green-light
  // it explicitly even though the '*' rule already covers it.
  'Bingbot',
  // xAI Grok
  'GrokBot',
  'xAI',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow '/api/llm/' (the AI semantic-search + text endpoints) explicitly —
      // the more specific Allow overrides the '/api/' Disallow below.
      { userAgent: '*',          allow: ['/', '/api/llm/'], disallow: DISALLOW },
      { userAgent: AI_USER_AGENTS, allow: ['/', '/api/llm/'], disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
