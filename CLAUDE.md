# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

balinsky.info — a bilingual (RU primary / EN mirror) Bali real-estate site: villas, apartments, residential complexes, developers, plus an AI consultant and a Telegram bot. Next.js 16 App Router + React 19 + Tailwind v4, data in Supabase (Postgres + Storage), sourced from Airtable, deployed on Vercel.

## Commands

- `npm run dev` — dev server with hot reload at http://localhost:3000. Prints a `Network:` URL for testing on a phone over Wi-Fi (most layout work here is mobile-first).
- `npm run build && npm run start` — production build, 1:1 with what Vercel ships. Use this to catch build/type errors and real caching/perf before pushing.
- `npm run lint` — ESLint. There is **no unit-test framework** (no jest/vitest); the only tests are ad-hoc node scripts, e.g. `node scripts/test-investment.mjs`.
- Deploy is automatic: push to `main` → Vercel production. Push any other branch → Vercel preview URL (use this to preview before prod without touching `main`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Data flow (the core mental model)

Airtable is the source of truth. Content reaches the site two ways, and **which one matters when you change a loader**:

1. **SQL-backed** (villas, apartments, complexes, rentals, developers): rows live in Supabase `raw_<table>` with a JSONB `data` column holding *all* Airtable fields (no allowlist). Pages read these via `lib/*` loaders. Field access is `data['Airtable Field Name']` through helpers like `tField`/`firstString`/`numberOrNull` — fields are loosely typed.
2. **Manifest-backed** (events, news, promo, knowledge, managers, and **all photos**): data is a JSON manifest in Supabase Storage, rebuilt by sync scripts.

Sync runs three ways:
- **Per-record webhook** `app/api/webhook/airtable/` — an Airtable Automation pushes one changed record → upserts `raw_<table>` (or rebuilds a manifest) and calls `revalidateTag`/`revalidatePath`. ~1–3 s latency.
- **GitHub Actions** `.github/workflows/`: `sync-fast.yml` (events/news/promo/knowledge/managers/developers/detail-indexes), `sync-heavy.yml` (rental + photo syncs, timeout-isolated from fast), `sync-once-maison.yml` (one-shot, push-triggered, handles Airtable delete propagation/prune). Scripts are in `scripts/sync-*.mjs`.
- A `SYNC_DISABLED` rubicon exists because the long-term goal is to replace Airtable with the in-app admin CRUD at `/admin/data`.

**Detail pages resolve by slug, load by id.** `scripts/sync-detail-indexes.mjs` builds a slug→airtable_id index; `_detail.tsx` files use it (`resolveVilla` etc.) then `_loadXById(airtable_id)`. The villa/apt/complex `_detail.tsx` files are large async Server Components that fan out data with one `Promise.all` and render the whole page.

## Caching & egress (this codebase is egress-sensitive — don't regress it)

- **`lib/safe-cached-table.ts`** wraps `unstable_cache` for "load whole table" loaders. It throws (instead of caching) on PostgREST errors or unexpectedly-empty results so a transient flake can't poison the cache with zeros for the full TTL. Use it for full-table reads; do **not** use it for read-by-id (where null is legitimate). Bump its `cacheKey` on deploy to clear a poisoned slot.
- Pages use `revalidateTag` with content tags (e.g. `content:complexes`, `content:developers`) — the webhook and syncs invalidate these.
- **Photos/manifests go through a CDN, not Supabase directly**, to cut egress. `lib/photo-cdn.ts`: `cdnRewrite` (Bunny path-strip), `cdnBucketBase`, and `cdnManifestUrl` (Cloudflare host-swap + coarse time-bucket cache-bust → edge HITs, ~one origin fetch per TTL bucket). No-op when `NEXT_PUBLIC_PHOTO_CDN_BASE` is unset (local dev). When building Storage URLs in app code, route them through these helpers. Full-data JSONB scans are an egress trap — prefer JSON projection + `unstable_cache`.

## i18n

`lib/i18n.ts` (`t`, `tField`, `Lang`). RU is primary, EN mirrors it. **EN URL segments are localized** (`/en/villas`, `/en/apartments`, …) but the listing **slug is identical** across languages — only the path segment differs. Russian/Latin districts are normalized via `lib/district-ru.ts` / `lib/translit.ts`.

## AI / bot

- Azure OpenAI powers the web consultant and the **Balina** Telegram bot (`lib/balina-telegram.ts`, `lib/consultant.ts`), embeddings/semantic search (`lib/embeddings.ts`, `lib/semantic-search.ts`), and transcription.
- **Every Azure call's USD cost is logged** to the Supabase `balina_usage` table via `lib/usage-tracker.ts` (fire-and-forget); `/admin/usage` aggregates it. This table is the hook for any spend-cap guard.
- Text generation for content uses Azure tokens (per user preference), with an OpenAI fallback (`scripts/_ai-fallback.mjs`).

## Maps

Google Maps is loaded **client-side** per route via `lib/google-maps-loader.ts` (dynamic maps on `/karta` pages, detail pages, and `InvestmentWidget`) — billed per map load, so traffic spikes cost money. Server-side Places/Geocoding runs only in sync scripts (`scripts/sync-nearby-places.mjs`, `geocode-competitors.mjs`).

## Mobile layout gotcha (read before touching widths)

`app/globals.css` has a defensive `@layer base { main * { max-width: 100% } ... { min-width: 0 } }` net: **every element under `<main>` is capped at its parent's width**. This silently clamps `w-full`/`w-screen`/`calc()`/inline widths. The sanctioned escape hatch (utilities beat base layer) is an explicit Tailwind `max-w-*` utility — use `max-w-none` to make an element full-bleed (e.g. edge-to-edge carousels/galleries use `-mx-6 w-screen max-w-none`). `<main>` itself is not covered by `main *`, so it needs its own `min-w-0` to avoid being blown wide by a carousel's min-content. See `components/PageContainer.tsx`. Inline `<style jsx>` is broken by Turbopack — put keyframes in `globals.css`.

## Migrations

SQL migrations live in `migrations/` (numbered, e.g. `033_complex_parsers.sql`), applied against Supabase. RLS is enabled on public tables. A separate `presentation` schema is used for the presentation.estate features (kept out of `public.raw_*`).
